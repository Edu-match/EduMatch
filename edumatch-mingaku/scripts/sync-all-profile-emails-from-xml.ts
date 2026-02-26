/**
 * WordPress 商品XML と（必要なら）著者XML を正として、Supabase の全 Profile の email を一括で正しい値に更新する。
 *
 * - 商品XML（product の wp:postmeta）から seller_name → seller_email_1 の対応を取得
 * - wp:author からサイト著者メール（エデュマッチ事務局用）を取得
 * - 名前が一致する Profile の email を上書き
 *
 * 使い方:
 *   npx tsx scripts/sync-all-profile-emails-from-xml.ts [商品が含まれるWordPress.xmlのパス]
 *   # 商品XMLに seller_name/seller_email_1 が含まれるもの（例: WordPress.2026-02-19.xml）
 *   # (2).xml はイベントのみのため、商品XMLを別途指定するか同じファイルに商品が含まれるものを指定
 *
 * 例:
 *   WXPATH=/Users/Ryo/Downloads/WordPress.2026-02-19.xml npx tsx scripts/sync-all-profile-emails-from-xml.ts
 *   npx tsx scripts/sync-all-profile-emails-from-xml.ts "/Users/Ryo/Downloads/WordPress.2026-02-19.xml"
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

const VENDOR_EMAIL_SUFFIX = "@edu-match.local";
const EDITOR_NAME = "エデュマッチ事務局";
const FALLBACK_EDITOR_EMAIL = "editor@edu-match.com";

const DEFAULT_PRODUCTS_XML = "/Users/Ryo/Downloads/WordPress.2026-02-19.xml";

function getText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v !== null && "#text" in v)
    return getText((v as { "#text": unknown })["#text"]);
  if (typeof v === "object" && v !== null && "_" in v)
    return getText((v as { _: unknown })._);
  return String(v).trim();
}

function getMetaFromItem(item: Record<string, unknown>, metaKey: string): string | null {
  const postmeta = item["wp:postmeta"];
  if (!postmeta) return null;
  const list = Array.isArray(postmeta) ? postmeta : [postmeta];
  for (const m of list) {
    const meta = m as Record<string, unknown>;
    const key = getText(meta["wp:meta_key"]);
    if (key === metaKey) {
      const val = getText(meta["wp:meta_value"]);
      return val || null;
    }
  }
  return null;
}

function getSellerNameFromItem(item: Record<string, unknown>): string | null {
  const name = getMetaFromItem(item, "seller_name");
  if (name) return name;
  const cats = item.category;
  if (cats) {
    const arr = Array.isArray(cats) ? cats : [cats];
    for (const c of arr) {
      const raw = c as Record<string, unknown>;
      const domain = getText(raw["@_domain"] ?? raw.domain);
      if (domain === "service_vender") {
        const label = getText(raw["#text"] ?? raw._ ?? c);
        if (label) return label;
        break;
      }
    }
  }
  return null;
}

/** XML から seller_name -> email のマップと、著者メール（1件目）を取得 */
function extractNameToEmailFromXml(xmlPath: string): {
  nameToEmail: Map<string, string>;
  authorEmail: string | null;
} {
  const xmlContent = fs.readFileSync(xmlPath, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const jsonObj = parser.parse(xmlContent);
  const channel = jsonObj.rss?.channel;
  const nameToEmail = new Map<string, string>();

  let authorEmail: string | null = null;
  const authorBlock = channel?.["wp:author"];
  if (authorBlock) {
    const authors = Array.isArray(authorBlock) ? authorBlock : [authorBlock];
    const first = authors[0] as Record<string, unknown> | undefined;
    if (first) {
      const email = getText(first["wp:author_email"]);
      if (email) authorEmail = email;
    }
  }

  const items = channel?.item;
  if (!items) return { nameToEmail, authorEmail };

  const itemList = Array.isArray(items) ? items : [items];
  for (const item of itemList) {
    const postType = getText((item as Record<string, unknown>)["wp:post_type"]);
    if (postType !== "product") continue;

    const sellerName = getSellerNameFromItem(item as Record<string, unknown>);
    if (!sellerName) continue;

    const email =
      getMetaFromItem(item as Record<string, unknown>, "seller_email_1") ||
      getMetaFromItem(item as Record<string, unknown>, "seller_email") ||
      null;
    if (!email) continue;

    if (!nameToEmail.has(sellerName)) {
      nameToEmail.set(sellerName, email);
    }
  }

  return { nameToEmail, authorEmail };
}

async function main() {
  const xmlPath =
    process.argv[2] || process.env.WXPATH || process.env.PRODUCTS_XML_PATH || DEFAULT_PRODUCTS_XML;
  const resolvedPath = path.resolve(xmlPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error("❌ XML が見つかりません:", resolvedPath);
    console.error("   商品（product）の seller_name / seller_email_1 が含まれる WordPress エクスポートを指定してください。");
    process.exit(1);
  }

  console.log("📄 使用する XML:", resolvedPath);
  const { nameToEmail, authorEmail } = extractNameToEmailFromXml(resolvedPath);
  console.log("📧 事業者名→メール:", nameToEmail.size, "件");
  if (authorEmail) console.log("📧 サイト著者メール（エデュマッチ事務局用）:", authorEmail);

  const profiles = await prisma.profile.findMany({
    select: { id: true, name: true, email: true },
  });

  const needUpdate = profiles.filter(
    (p) =>
      p.email.endsWith(VENDOR_EMAIL_SUFFIX) ||
      p.email === FALLBACK_EDITOR_EMAIL ||
      (p.name === EDITOR_NAME && authorEmail && p.email !== authorEmail)
  );

  if (needUpdate.length === 0) {
    console.log("✅ 修正対象の Profile はありません（既に正しいメールか、仮メールの Profile がありません）");
    return;
  }

  const usedEmails = new Set<string>();
  let updated = 0;
  let skipped = 0;

  for (const profile of needUpdate) {
    const correctEmail =
      profile.name === EDITOR_NAME && authorEmail
        ? authorEmail
        : nameToEmail.get(profile.name) ?? null;

    if (!correctEmail) {
      console.log("⚠️  メール未定義（XMLに該当なし）:", profile.name, "→ スキップ");
      skipped++;
      continue;
    }

    if (profile.email === correctEmail) {
      skipped++;
      continue;
    }

    if (usedEmails.has(correctEmail)) {
      const placeholder = `${correctEmail.replace("@", `+dup${profile.id.slice(0, 8)}@`)}`;
      console.log("⚠️  重複のため別メールで退避:", profile.name, "→", placeholder);
      await prisma.profile.update({
        where: { id: profile.id },
        data: { email: placeholder },
      });
      updated++;
      continue;
    }

    const existing = await prisma.profile.findUnique({
      where: { email: correctEmail },
      select: { id: true },
    });
    if (existing && existing.id !== profile.id) {
      const placeholder = `${correctEmail.replace("@", "+old@")}`;
      await prisma.profile.update({
        where: { id: existing.id },
        data: { email: placeholder },
      });
    }

    await prisma.profile.update({
      where: { id: profile.id },
      data: { email: correctEmail },
    });
    usedEmails.add(correctEmail);
    console.log("✅", profile.name, ":", profile.email, "→", correctEmail);
    updated++;
  }

  console.log("\n📊 更新:", updated, "件 / スキップ:", skipped, "件");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
