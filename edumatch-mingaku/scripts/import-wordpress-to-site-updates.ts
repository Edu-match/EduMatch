/**
 * WordPress エクスポート XML を運営情報テーブル（SiteUpdate）に投入
 *
 * 使い方:
 *   npx tsx scripts/import-wordpress-to-site-updates.ts [path/to/WordPress.xml]
 *
 * 省略時は環境変数 WP_XML_PATH または既定パスを使用。
 * wp_post_id で upsert するため、再実行しても重複しません。
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

const DEFAULT_XML = path.join(process.cwd(), "data", "WordPress.2026-02-17.xml");

function getText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node.trim();
  if (Array.isArray(node)) return getText(node[0]);
  if (typeof node === "object" && node !== null && "#text" in node) return String((node as { "#text": unknown })["#text"] ?? "").trim();
  return "";
}

function parseDate(val: unknown): Date | null {
  const s = getText(val);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const xmlPath = process.argv[2] || process.env.WP_XML_PATH || DEFAULT_XML;
  if (!fs.existsSync(xmlPath)) {
    console.error("XML not found:", xmlPath);
    console.error("Usage: npx tsx scripts/import-wordpress-to-site-updates.ts [path/to/WordPress.xml]");
    process.exit(1);
  }

  const xmlContent = fs.readFileSync(xmlPath, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const jsonObj = parser.parse(xmlContent);
  const items = jsonObj.rss?.channel?.item;
  if (!items) {
    console.warn("No items in XML.");
    return;
  }

  const itemList = Array.isArray(items) ? items : [items];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of itemList) {
    const postType = getText(item["wp:post_type"]);
    if (postType !== "post" && postType !== "page") continue;

    const status = getText(item["wp:status"]);
    if (status === "trash" || status === "inherit") continue;

    const wpPostIdRaw = item["wp:post_id"];
    const wpPostId = wpPostIdRaw != null ? parseInt(String(wpPostIdRaw), 10) : null;
    if (wpPostId == null || isNaN(wpPostId)) continue;

    const title = getText(item.title) || "無題";
    const body = getText(item["content:encoded"]) || "";
    const excerpt = getText(item["excerpt:encoded"]) || null;
    const link = getText(item.link) || null;
    const publishedAt = parseDate(item["wp:post_date_gmt"] ?? item["wp:post_date"] ?? item.pubDate);
    if (!publishedAt) {
      skipped++;
      continue;
    }

    const categoryLabel = (() => {
      const cats = item.category;
      if (!cats) return null;
      const arr = Array.isArray(cats) ? cats : [cats];
      for (const c of arr) {
        const raw = c as Record<string, unknown>;
        const domain = (raw["@_domain"] ?? raw.domain) as string | undefined;
        const label = getText(raw["#text"] ?? raw._ ?? c);
        if (domain === "category" && label) return label;
      }
      return null;
    })();

    const bodyFirstImg = body.match(/<img[^>]+src=["']([^"']+)["']/);
    const thumbnail_url = bodyFirstImg ? bodyFirstImg[1] : null;

    try {
      const existing = await prisma.siteUpdate.findUnique({ where: { wp_post_id: wpPostId } });
      if (existing) {
        await prisma.siteUpdate.update({
          where: { id: existing.id },
          data: {
            title,
            body,
            excerpt,
            published_at: publishedAt,
            link,
            thumbnail_url,
            category: categoryLabel,
            updated_at: new Date(),
          },
        });
        updated++;
        console.log("  Updated:", title);
      } else {
        await prisma.siteUpdate.create({
          data: {
            title,
            body,
            excerpt,
            published_at: publishedAt,
            link,
            wp_post_id: wpPostId,
            thumbnail_url,
            category: categoryLabel,
          },
        });
        created++;
        console.log("  Created:", title);
      }
    } catch (e) {
      console.error("  Failed:", title, e);
    }
  }

  console.log("\nDone. Created:", created, "Updated:", updated, "Skipped:", skipped);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
