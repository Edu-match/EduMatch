/**
 * 全記事の投稿者表示名を「エデュマッチ事務局」に一括更新する（Supabase/DBに保存）
 *
 * 使い方:
 *   npx tsx scripts/set-article-author-to-office.ts
 */
import { prisma } from "../src/lib/prisma";

const AUTHOR_DISPLAY_NAME = "エデュマッチ事務局";

async function main() {
  const result = await prisma.post.updateMany({
    data: { author_display_name: AUTHOR_DISPLAY_NAME },
  });

  console.log(`Updated ${result.count} post(s) to author_display_name = "${AUTHOR_DISPLAY_NAME}".`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
