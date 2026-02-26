/**
 * WordPressエクスポートXMLの著者メールを元に、Supabase Profile の email を修正する
 *
 * 使い方:
 *   npx tsx scripts/fix-profile-email-from-wordpress.ts
 *   # または XML パスを指定
 *   WXPATH=/path/to/WordPress.2026-02-19.xml npx tsx scripts/fix-profile-email-from-wordpress.ts
 *
 * 対象: name が「エデュマッチ事務局」の Profile、または email が editor@edu-match.com の Profile を、
 *      WordPress の著者（wp:author）の author_email に合わせて更新する。
 *      vendor-xxx@edu-match.local になっている場合も name でヒットすれば修正する。
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const EDITOR_NAME = "エデュマッチ事務局";
const FALLBACK_EDITOR_EMAIL = "editor@edu-match.com";
/** 移行時に仮で入れたメール（vendor-uuid@edu-match.local） */
const VENDOR_EMAIL_SUFFIX = "@edu-match.local";

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
  // wp:author ブロックを抽出（1行にまとまっている形式に対応）
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

async function main() {
  const xmlPath = process.env.WXPATH || DEFAULT_WP_XML_PATH;
  if (!fs.existsSync(xmlPath)) {
    console.error("❌ WordPress XML が見つかりません:", xmlPath);
    console.error("   WXPATH でパスを指定してください。");
    process.exit(1);
  }

  const authors = extractAuthorsFromWordPressXml(xmlPath);
  if (authors.length === 0) {
    console.error("❌ XML から著者（wp:author）を取得できませんでした。");
    process.exit(1);
  }

  const primaryAuthor = authors[0]!;
  const correctEmail = primaryAuthor.author_email;
  if (!correctEmail) {
    console.error("❌ 著者のメールアドレスが空です。");
    process.exit(1);
  }

  console.log("📄 WordPress XML:", xmlPath);
  console.log("📧 正しいメール（WordPress 著者）:", correctEmail);
  console.log("   著者:", primaryAuthor.author_display_name || primaryAuthor.author_login);

  // 修正対象は「エデュマッチ事務局」または email=editor@edu-match.com の Profile のみ（他ベンダーの vendor-xxx@edu-match.local は触らない）
  const byName = await prisma.profile.findMany({ where: { name: EDITOR_NAME } });
  const byEditorEmail = await prisma.profile.findMany({ where: { email: FALLBACK_EDITOR_EMAIL } });
  const candidates = [...byName, ...byEditorEmail];
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const needUpdate = Array.from(byId.values()).filter((p) => p.email !== correctEmail);
  const target =
    needUpdate.find((p) => p.name === EDITOR_NAME) ??
    needUpdate.find((p) => p.email === FALLBACK_EDITOR_EMAIL) ??
    needUpdate[0] ?? null;

  if (!target) {
    console.log("⚠️  修正が必要な Profile が見つかりません（いずれも既に正しいメールか、候補がありません）");
    const anyVendor = await prisma.profile.findFirst({
      where: { email: { endsWith: VENDOR_EMAIL_SUFFIX } },
      select: { id: true, name: true, email: true },
    });
    if (anyVendor) {
      console.log("   参考: *@edu-match.local の Profile 例:", anyVendor.name, anyVendor.email);
    }
    return;
  }

  if (target.email.endsWith(VENDOR_EMAIL_SUFFIX)) {
    console.log("📌 仮メール（vendor-xxx@edu-match.local）の Profile を検出しました:", target.name, "→", correctEmail);
  }

  // 既に correctEmail を持つ別の Profile がいる場合、そちらの email を退避してから修正対象を正しいメールにする
  const existingWithCorrect = await prisma.profile.findUnique({
    where: { email: correctEmail },
    select: { id: true, name: true, email: true },
  });
  if (existingWithCorrect && existingWithCorrect.id !== target.id) {
    const placeholder = `${correctEmail.replace("@", "+old@")}`;
    console.log("⚠️  既に別の Profile が正しいメールを使用しています。退避してから修正します。");
    console.log("   退避先:", existingWithCorrect.id, existingWithCorrect.name, "→", placeholder);
    await prisma.profile.update({
      where: { id: existingWithCorrect.id },
      data: { email: placeholder },
    });
  }

  await prisma.profile.update({
    where: { id: target.id },
    data: { email: correctEmail },
  });
  console.log("✅ Profile を更新しました:");
  console.log("   id:", target.id);
  console.log("   name:", target.name);
  console.log("   email:", target.email, "→", correctEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
