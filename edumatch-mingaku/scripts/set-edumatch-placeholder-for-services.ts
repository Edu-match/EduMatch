/**
 * thumbnail_url が null のサービスに、エデュマッチ用プレースホルダー画像URLを一括設定する。
 * 使い方: npx tsx scripts/set-edumatch-placeholder-for-services.ts
 */
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const EDUMATCH_PLACEHOLDER_URL =
  "https://placehold.co/400x300/e0f2fe/0369a1?text=EduMatch";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.service.updateMany({
    where: { thumbnail_url: null },
    data: { thumbnail_url: EDUMATCH_PLACEHOLDER_URL },
  });
  console.log(`thumbnail_url をエデュマッチ用プレースホルダーに更新しました: ${result.count} 件`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
