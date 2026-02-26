/**
 * サービス名・提供者名で検索（DBに存在するか確認）
 * 使い方: npx tsx scripts/check-service-by-name.ts [検索文字列]
 * 例: npx tsx scripts/check-service-by-name.ts ワンリード
 *     npx tsx scripts/check-service-by-name.ts CROP
 */
import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const q = process.argv[2] || "ワンリード";
  const services = await prisma.service.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { provider_display_name: { contains: q, mode: "insensitive" } },
        { provider: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      title: true,
      provider_display_name: true,
      provider: { select: { name: true } },
      status: true,
      is_published: true,
    },
  });
  console.log(`"${q}" に一致するサービス: ${services.length} 件\n`);
  services.forEach((s) => {
    console.log(`  id: ${s.id}`);
    console.log(`  タイトル: ${s.title}`);
    console.log(`  提供者表示名: ${s.provider_display_name ?? "(未設定)"}`);
    console.log(`  提供者名: ${s.provider.name}`);
    console.log(`  公開: ${s.is_published} / status: ${s.status}`);
    console.log("");
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
