/**
 * WordPress エクスポート XML を正として、Supabase の Profile を上書きする。
 * XML 内の wp:author（email, display_name）で該当 Profile を更新する。
 *
 * 使い方:
 *   npx tsx scripts/fix-profile-email-from-wordpress.ts
 *   WXPATH=/path/to/WordPress.2026-02-19.xml npx tsx scripts/fix-profile-email-from-wordpress.ts
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

const DEFAULT_WP_XML_PATH = "/Users/Ryo/Downloads/WordPress.2026-02-19.xml";

type WpAuthor = {
  author_id: string;
  author_login: string;
  author_email: string;
  author_display_name: string;
};

function extractAuthorsFromWordPressXml(xmlPath: string): WpAuthor[] {
  const xml = fs.readFileSync(xmlPath, "utf-8");
  const authors: WpAuthor[] = [];
  const authorBlockRegex =
    /<wp:author>\s*<wp:author_id>([^<]*)<\/wp:author_id>\s*<wp:author_login><!\[CDATA\[([^\]]*)\]\]><\/wp:author_login>\s*<wp:author_email><!\[CDATA\[([^\]]*)\]\]><\/wp:author_email>\s*<wp:author_display_name><!\[CDATA\[([^\]]*)\]\]><\/wp:author_display_name>/g;
  let m: RegExpExecArray | null;
  while ((m = authorBlockRegex.exec(xml)) !== null) {
    authors.push({
      author_id: m[1]!.trim(),
      author_login: m[2]!.trim(),
      author_email: m[3]!.trim(),
      author_display_name: m[4]!.trim(),
    });
  }
  return authors;
}

/** XML の著者に合わせて上書きすべき Profile を1件取得（優先: エデュマッチ事務局 > editor@ > *@edu-match.local） */
async function findProfileToOverwriteFromXml(): Promise<{ id: string; name: string; email: string } | null> {
  const byName = await prisma.profile.findFirst({ where: { name: "エデュマッチ事務局" } });
  if (byName) return byName;
  const byEditor = await prisma.profile.findFirst({ where: { email: "editor@edu-match.com" } });
  if (byEditor) return byEditor;
  const byVendor = await prisma.profile.findFirst({
    where: { email: { endsWith: "@edu-match.local" } },
  });
  return byVendor;
}

async function main() {
  const xmlPath = process.env.WXPATH || DEFAULT_WP_XML_PATH;
  if (!fs.existsSync(xmlPath)) {
    console.error("❌ WordPress XML が見つかりません:", xmlPath);
    process.exit(1);
  }

  const authors = extractAuthorsFromWordPressXml(xmlPath);
  if (authors.length === 0) {
    console.error("❌ XML から著者（wp:author）を取得できませんでした。");
    process.exit(1);
  }

  const primary = authors[0]!;
  const emailFromXml = primary.author_email?.trim() || "";
  const nameFromXml = (primary.author_display_name || primary.author_login || "").trim() || "エデュマッチ事務局";
  if (!emailFromXml) {
    console.error("❌ XML 著者のメールが空です。");
    process.exit(1);
  }

  console.log("📄 正とする XML:", xmlPath);
  console.log("📧 XML 著者 → Supabase に反映する値: email =", emailFromXml, ", name =", nameFromXml);

  const target = await findProfileToOverwriteFromXml();
  if (!target) {
    console.log("⚠️  上書き対象の Profile がありません（name=エデュマッチ事務局 / editor@... / *@edu-match.local のいずれか）");
    return;
  }

  // 既に同じ email を別の Profile が持っている場合は退避
  const existing = await prisma.profile.findUnique({
    where: { email: emailFromXml },
    select: { id: true, name: true },
  });
  if (existing && existing.id !== target.id) {
    const placeholder = emailFromXml.replace("@", "+old@");
    console.log("⚠️  別 Profile が既にその email を使用中。退避:", existing.name, "→", placeholder);
    await prisma.profile.update({
      where: { id: existing.id },
      data: { email: placeholder },
    });
  }

  await prisma.profile.update({
    where: { id: target.id },
    data: {
      email: emailFromXml,
      name: nameFromXml,
    },
  });
  console.log("✅ Supabase Profile を XML の内容で上書きしました:");
  console.log("   id:", target.id);
  console.log("   name:", target.name, "→", nameFromXml);
  console.log("   email:", target.email, "→", emailFromXml);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
