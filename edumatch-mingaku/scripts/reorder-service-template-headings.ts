/**
 * Service.content 内の定型見出しを指定順に並べ替える（Markdown / プレーン両対応）。
 *
 * 実行: npx tsx scripts/reorder-service-template-headings.ts
 * ドライラン: npx tsx scripts/reorder-service-template-headings.ts --dry-run
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { RAW_MARKDOWN_PREFIX } from "@/lib/markdown-to-blocks";

const SECTION_ORDER = [
  "ソリューション紹介",
  "相性の良い教室",
  "ココがすごい！",
  "強み",
  "人気の利用シーン",
  "利用料の考え方",
  "留意点",
  "ご興味のある方へのメッセージ",
] as const;

type SectionKey = (typeof SECTION_ORDER)[number];

const KEY_SET = new Set<string>(SECTION_ORDER);
const KEYS_LONG_TO_SHORT = [...SECTION_ORDER].sort((a, b) => b.length - a.length);

function canonicalKeyFromHeadingText(s: string): SectionKey | null {
  const t = s.trim();
  for (const k of KEYS_LONG_TO_SHORT) {
    if (t === k) return k;
    if (t.endsWith(k)) {
      const i = t.length - k.length;
      if (i === 0) return k;
      const before = t[i - 1];
      if (before === " " || before === "　") return k;
    }
  }
  return null;
}

function headingDisplayFromLine(titleLine: string): string {
  return titleLine.replace(/^##\s+/, "").trim();
}

function isMarkdownH2Line(line: string): boolean {
  return line.startsWith("## ") && !line.startsWith("###");
}

function extractLiuYiDianFromBody(body: string): { stripped: string; inner: string | null } {
  const n = body.replace(/\r\n/g, "\n");
  const re = /\n?###\s*留意点\s*\n([\s\S]*?)(?=\n## |\n### |\s*$)/;
  const m = n.match(re);
  if (!m) return { stripped: body, inner: null };
  const inner = m[1].replace(/\s+$/, "");
  const without = (n.slice(0, m.index!) + n.slice(m.index! + m[0].length))
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  return { stripped: without, inner };
}

function reorderMarkdown(inner: string): string | null {
  const normalized = inner.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  let i = 0;
  const preamble: string[] = [];
  while (i < lines.length && !isMarkdownH2Line(lines[i])) {
    preamble.push(lines[i]);
    i++;
  }

  type Parsed = { titleLine: string; headingDisplay: string; key: SectionKey | null; body: string };
  const parsed: Parsed[] = [];

  while (i < lines.length) {
    const titleLine = lines[i];
    if (!isMarkdownH2Line(titleLine)) {
      preamble.push(lines[i]);
      i++;
      continue;
    }
    i++;
    const bodyStart = i;
    while (i < lines.length && !isMarkdownH2Line(lines[i])) i++;
    const body = lines.slice(bodyStart, i).join("\n");
    const headingDisplay = headingDisplayFromLine(titleLine);
    const key = canonicalKeyFromHeadingText(headingDisplay);
    parsed.push({ titleLine, headingDisplay, key, body });
  }

  let liuYiDianInner: string | null = null;
  const adjusted: Parsed[] = parsed.map((p) => {
    const { stripped, inner } = extractLiuYiDianFromBody(p.body);
    if (inner != null) {
      if (liuYiDianInner == null) liuYiDianInner = inner;
      else liuYiDianInner = `${liuYiDianInner}\n\n${inner}`;
    }
    return { ...p, body: stripped };
  });

  const byKey = new Map<SectionKey, { headingDisplay: string; body: string }>();
  const unknown: Parsed[] = [];

  for (const p of adjusted) {
    if (p.key) {
      if (!byKey.has(p.key)) {
        byKey.set(p.key, { headingDisplay: p.headingDisplay, body: p.body });
      } else {
        unknown.push(p);
      }
    } else {
      unknown.push(p);
    }
  }

  if (liuYiDianInner != null && !byKey.has("留意点")) {
    byKey.set("留意点", { headingDisplay: "留意点", body: liuYiDianInner });
    liuYiDianInner = null;
  } else if (liuYiDianInner != null && byKey.has("留意点")) {
    const cur = byKey.get("留意点")!;
    byKey.set("留意点", {
      headingDisplay: cur.headingDisplay,
      body: `${cur.body}\n\n${liuYiDianInner}`.trim(),
    });
  }

  const out: string[] = [];
  if (preamble.length) {
    out.push(preamble.join("\n"));
  }

  for (const key of SECTION_ORDER) {
    const sec = byKey.get(key);
    if (!sec) continue;
    const block = `\n## ${sec.headingDisplay}\n\n${sec.body.trim()}\n`;
    out.push(block);
  }

  for (const u of unknown) {
    out.push(`\n${u.titleLine}\n\n${u.body.trim()}\n`);
  }

  let result = out.join("").replace(/^\n+/, "");
  if (!result.endsWith("\n")) result += "\n";
  const norm = (s: string) => s.replace(/\r\n/g, "\n").trimEnd() + "\n";
  if (norm(result) === norm(normalized)) return null;
  return result;
}

function reorderPlain(inner: string): string | null {
  const lines = inner.split(/\r?\n/);
  const keyLineCounts = new Map<string, number>();
  for (const line of lines) {
    const t = line.trim();
    if (KEY_SET.has(t)) keyLineCounts.set(t, (keyLineCounts.get(t) ?? 0) + 1);
  }
  for (const c of keyLineCounts.values()) {
    if (c > 1) return null;
  }

  let i = 0;
  const preamble: string[] = [];

  while (i < lines.length) {
    const t = lines[i].trim();
    if (KEY_SET.has(t)) break;
    preamble.push(lines[i]);
    i++;
  }

  const sections = new Map<SectionKey, string[]>();

  while (i < lines.length) {
    const t = lines[i].trim() as SectionKey;
    if (!KEY_SET.has(t)) {
      preamble.push(lines[i]);
      i++;
      continue;
    }
    const key = t;
    i++;
    const body: string[] = [];
    while (i < lines.length && !KEY_SET.has(lines[i].trim())) {
      body.push(lines[i]);
      i++;
    }
    if (!sections.has(key)) {
      sections.set(key, body);
    }
  }

  if (sections.size === 0) return null;

  const chunks: string[] = [];
  if (preamble.length) chunks.push(preamble.join("\n").replace(/\s+$/, ""));
  for (const key of SECTION_ORDER) {
    const bodyLines = sections.get(key);
    if (!bodyLines) continue;
    const body = bodyLines.join("\n").replace(/\s+$/, "");
    chunks.push(`${key}\n\n${body}`);
  }
  const result = chunks.filter(Boolean).join("\n\n") + "\n";
  const norm = (s: string) => s.replace(/\r\n/g, "\n").trimEnd() + "\n";
  if (norm(result) === norm(inner)) return null;
  return result;
}

function transformContent(content: string): string | null {
  const hasRaw = content.startsWith(RAW_MARKDOWN_PREFIX);
  const inner = hasRaw ? content.slice(RAW_MARKDOWN_PREFIX.length) : content;

  const looksMd =
    /(^|\n)## [^#\n]/.test(inner) ||
    inner.split(/\r?\n/).some((l) => isMarkdownH2Line(l));

  let nextInner: string | null;
  if (looksMd) nextInner = reorderMarkdown(inner);
  else nextInner = reorderPlain(inner);

  if (nextInner == null) return null;
  return hasRaw ? `${RAW_MARKDOWN_PREFIX}${nextInner}` : nextInner;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const rows = await prisma.service.findMany({ select: { id: true, content: true } });
  let updated = 0;
  for (const row of rows) {
    const next = transformContent(row.content);
    if (next == null || next === row.content) continue;
    updated++;
    if (dry) {
      console.log(`[dry-run] would update ${row.id}`);
      continue;
    }
    await prisma.service.update({ where: { id: row.id }, data: { content: next } });
    console.log(`updated ${row.id}`);
  }
  console.log(dry ? `dry-run: ${updated} row(s) would change` : `done: ${updated} row(s) updated`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
