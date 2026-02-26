/**
 * コードキャンプ株式会社の資料請求通知先を設定する。
 * kosuke.saito@codecamp.jp に加えて info@codecampkids.jp の2件に送信する。
 *
 * 実行: npx tsx scripts/set-codecamp-notification-emails.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CODECAMP_NAME = "コードキャンプ株式会社";
const EMAIL_PRIMARY = "kosuke.saito@codecamp.jp";
const EMAIL_ADDITIONAL = "info@codecampkids.jp";

async function main() {
  const profile = await prisma.profile.findFirst({
    where: { name: CODECAMP_NAME },
  });
  if (!profile) {
    console.error("❌ コードキャンプ株式会社 の Profile が見つかりません");
    process.exit(1);
  }
  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      email: EMAIL_PRIMARY,
      notification_email_2: EMAIL_ADDITIONAL,
      notification_email_3: null,
    },
  });
  console.log("✅ 設定しました:", profile.name);
  console.log("   email:", EMAIL_PRIMARY);
  console.log("   notification_email_2:", EMAIL_ADDITIONAL);
  console.log("   資料請求時は上記2件に送信されます。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
