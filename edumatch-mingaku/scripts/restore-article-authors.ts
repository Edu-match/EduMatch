/**
 * 記事.csv の著者情報を Post.author_display_name に反映する
 *
 * 使い方:
 *   npx tsx scripts/restore-article-authors.ts [記事.csvのパス]
 * 例:
 *   npx tsx scripts/restore-article-authors.ts ~/Downloads/記事.csv
 *
 * マッチ方法: Post.wp_post_id と CSV の ID 列で対応
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

const DEFAULT_CSV_PATH = path.join(process.cwd(), "data", "記事.csv");

function getDisplayName(row: Record<string, string>): string | null {
  const first = (row["Author First Name"] ?? "").trim();
  const last = (row["Author Last Name"] ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  const username = (row["Author Username"] ?? "").trim();
  return username || null;
}

async function main() {
  const csvPath = process.argv[2] || process.env.ARTICLES_CSV || DEFAULT_CSV_PATH;
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    console.error("Usage: npx tsx scripts/restore-article-authors.ts <path/to/記事.csv>");
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[];

  console.log("Loaded", rows.length, "rows from", csvPath);

  let updated = 0;
  let notFound = 0;
  let noWpId = 0;

  for (const row of rows) {
    const wpIdStr = row["ID"] ?? row["id"];
    if (wpIdStr == null || wpIdStr === "") {
      noWpId += 1;
      continue;
    }
    const wpId = parseInt(wpIdStr, 10);
    if (Number.isNaN(wpId)) continue;

    const displayName = getDisplayName(row);
    if (!displayName) continue;

    const post = await prisma.post.findFirst({
      where: { wp_post_id: wpId },
      select: { id: true, title: true, author_display_name: true },
    });

    if (!post) {
      notFound += 1;
      if (notFound <= 5) console.warn("Post not found for wp_post_id:", wpId, row["Title"]?.slice(0, 40));
      continue;
    }

    if (post.author_display_name === displayName) continue;

    await prisma.post.update({
      where: { id: post.id },
      data: { author_display_name: displayName },
    });
    updated += 1;
    if (updated <= 10) console.log("Updated:", post.title?.slice(0, 50), "->", displayName);
  }

  console.log("Done. Updated:", updated, "| Not found (wp_post_id):", notFound, "| No ID in CSV:", noWpId);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
