/**
 * WordPress XML から口コミ（wp:comment）をインポートするスクリプト
 *
 * 実行方法:
 *   npx tsx scripts/import-reviews-from-xml.ts [XMLパス]
 *
 * - wp:comment_approved = 1 の口コミのみ対象
 * - wp:comment_parent = 0 のトップレベルコメントのみ対象
 * - wp_comment_id ユニーク制約により重複インポートは自動スキップ
 * - インポート後に Service.review_count を再集計
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

const XML_PATH =
  process.argv[2] ||
  "/Users/Ryo/Downloads/WordPress.2026-02-19 (1).xml";

/** CDATA や単純値を文字列として取り出す */
function getText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null) {
    if ("#text" in v) return getText((v as Record<string, unknown>)["#text"]);
    if ("_" in v) return getText((v as Record<string, unknown>)._);
  }
  return String(v).trim();
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

function getMetaValue(
  metas: unknown,
  key: string
): string | null {
  const arr = toArray(metas as Record<string, unknown> | Record<string, unknown>[] | null);
  const found = arr.find((m) => getText((m as Record<string, unknown>)["wp:meta_key"]) === key);
  if (!found) return null;
  return getText((found as Record<string, unknown>)["wp:meta_value"]) || null;
}

async function main() {
  if (!fs.existsSync(XML_PATH)) {
    console.error(`XML ファイルが見つかりません: ${XML_PATH}`);
    console.error("Usage: npx tsx scripts/import-reviews-from-xml.ts <XMLファイルのパス>");
    process.exit(1);
  }

  console.log(`XML ファイルを読み込み中: ${XML_PATH}`);
  const xmlContent = fs.readFileSync(XML_PATH, "utf-8");

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const jsonObj = parser.parse(xmlContent);
  const channel = jsonObj?.rss?.channel;
  if (!channel) {
    console.error("XMLの解析に失敗しました（channel が見つかりません）");
    process.exit(1);
  }

  const items = toArray(channel.item);
  console.log(`全アイテム数: ${items.length}`);

  const products = items.filter(
    (item) => getText((item as Record<string, unknown>)["wp:post_type"]) === "product"
  );
  console.log(`商品（product）アイテム数: ${products.length}`);

  // サービスを全件ロードしてマップ化（高速化）
  const allServices = await prisma.service.findMany({
    select: { id: true, title: true, wp_product_id: true },
  });
  const servicesByWpId = new Map<number, { id: string; title: string }>();
  const servicesByTitle = new Map<string, { id: string; title: string }>();
  for (const s of allServices) {
    if (s.wp_product_id != null) servicesByWpId.set(s.wp_product_id, s);
    servicesByTitle.set(s.title.trim(), s);
  }

  let imported = 0;
  let skippedDup = 0;
  let noService = 0;
  let totalComments = 0;

  for (const rawItem of products) {
    const item = rawItem as Record<string, unknown>;
    const wpProductId = parseInt(getText(item["wp:post_id"]), 10);
    const title = getText(item.title);

    let service =
      (!isNaN(wpProductId) ? servicesByWpId.get(wpProductId) : undefined) ??
      (title ? servicesByTitle.get(title) : undefined) ??
      null;

    if (!service) {
      noService++;
      continue;
    }

    const comments = toArray(item["wp:comment"]);
    const topLevel = comments.filter((c) => {
      const raw = c as Record<string, unknown>;
      return (
        getText(raw["wp:comment_parent"]) === "0" &&
        getText(raw["wp:comment_approved"]) === "1"
      );
    });

    totalComments += topLevel.length;

    for (const rawComment of topLevel) {
      const comment = rawComment as Record<string, unknown>;
      const wpCommentId = parseInt(getText(comment["wp:comment_id"]), 10);
      const authorName = getText(comment["wp:comment_author"]) || "匿名";
      const body = getText(comment["wp:comment_content"]);
      if (!body) continue;

      // rating を commentmeta から取得（type=review のみ存在）
      const ratingStr = getMetaValue(comment["wp:commentmeta"], "rating");
      const ratingNum = ratingStr ? parseInt(ratingStr, 10) : null;
      const rating =
        ratingNum && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null;

      // 日付パース（GMT を優先）
      const dateStr = getText(
        comment["wp:comment_date_gmt"] || comment["wp:comment_date"]
      );
      let createdAt: Date;
      try {
        createdAt = new Date(dateStr.replace(" ", "T") + (dateStr.includes("T") ? "" : "Z"));
        if (isNaN(createdAt.getTime())) createdAt = new Date();
      } catch {
        createdAt = new Date();
      }

      try {
        await prisma.review.create({
          data: {
            service_id: service.id,
            author_name: authorName,
            rating,
            body,
            is_approved: true,
            wp_comment_id: isNaN(wpCommentId) ? null : wpCommentId,
            created_at: createdAt,
          },
        });
        imported++;
        if (imported % 50 === 0) process.stdout.write(`\n  ${imported} 件インポート済み`);
        else process.stdout.write(".");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Unique constraint") || msg.includes("unique constraint")) {
          skippedDup++;
        } else {
          console.error(`\nコメント ${wpCommentId} インポートエラー:`, msg);
        }
      }
    }
  }

  console.log(`\n\n口コミ候補: ${totalComments} 件`);

  if (imported > 0 || skippedDup === 0) {
    console.log("review_count を再集計中...");
    const counts = await prisma.review.groupBy({
      by: ["service_id"],
      _count: { id: true },
      where: { is_approved: true },
    });

    for (const c of counts) {
      await prisma.service.update({
        where: { id: c.service_id },
        data: { review_count: c._count.id },
      });
    }
    console.log(`review_count を更新: ${counts.length} サービス`);
  }

  console.log(`
完了:
  インポート: ${imported} 件
  スキップ（重複）: ${skippedDup} 件
  サービス未一致: ${noService} 商品`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
