/**
 * 既存のAuth.usersに存在するがProfileテーブルに存在しないユーザーを修正
 * Supabaseトリガー設定前に作成されたユーザーのProfileレコードを作成
 */

import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { prisma } from "@/lib/prisma";

async function fixMissingProfiles() {
  console.log("🔍 既存ユーザーのProfile不整合を確認中...");

  try {
    // Supabase Authの全ユーザーを取得
    const admin = createServiceRoleClient();
    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Auth.users取得エラー:", authError);
      return;
    }

    console.log(`📊 Auth.users: ${authUsers.users.length}件のユーザーが存在`);

    // 既存のProfileレコードを取得
    const existingProfiles = await prisma.profile.findMany({
      select: { id: true },
    });
    const existingProfileIds = new Set(existingProfiles.map((p) => p.id));

    console.log(`📊 Profile: ${existingProfiles.length}件のレコードが存在`);

    // Profileが存在しないユーザーを抽出
    const missingProfileUsers = authUsers.users.filter(
      (user) => !existingProfileIds.has(user.id)
    );

    if (missingProfileUsers.length === 0) {
      console.log("✅ すべてのAuth.usersにProfileレコードが存在します");
      return;
    }

    console.log(
      `⚠️  ${missingProfileUsers.length}件のユーザーにProfileレコードがありません`
    );

    // 不足しているProfileレコードを作成
    let successCount = 0;
    let errorCount = 0;

    for (const user of missingProfileUsers) {
      try {
        const name = user.user_metadata?.name || user.email?.split("@")[0] || "ユーザー";
        const role = user.user_metadata?.role === "PROVIDER" ? "PROVIDER" : "VIEWER";

        await prisma.profile.create({
          data: {
            id: user.id,
            name,
            email: user.email!,
            role,
            subscription_status: "INACTIVE",
          },
        });

        console.log(`✅ Profile作成成功: ${user.email} (${role})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Profile作成失敗: ${user.email}`, error);
        errorCount++;
      }
    }

    console.log("\n📊 実行結果:");
    console.log(`  - 成功: ${successCount}件`);
    console.log(`  - 失敗: ${errorCount}件`);
    console.log(`  - 合計: ${missingProfileUsers.length}件`);

    if (successCount > 0) {
      console.log("\n✅ Profileレコードの作成が完了しました");
    }
  } catch (error) {
    console.error("❌ スクリプト実行エラー:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
fixMissingProfiles()
  .then(() => {
    console.log("\n🎉 スクリプトが正常に完了しました");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 スクリプトが失敗しました:", error);
    process.exit(1);
  });
