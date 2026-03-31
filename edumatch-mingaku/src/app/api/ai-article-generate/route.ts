import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTICLE_CATEGORIES = [
  "AI", "ICT", "セミナー", "塾", "受験", "教育", "教材", "英語",
  "プログラミング", "保護者", "高校", "中学", "大学", "小学校",
  "教員", "地域", "学習", "オンライン", "補助金", "お役立ち情報",
  "事務局からのお知らせ", "未分類",
] as const;

const SYSTEM_PROMPT = `あなたはEduMatch（教育EdTechマッチングプラットフォーム）の記事ライターAIです。
提供されたWebページのテキストを元に、教育関係者・EdTech企業向けの記事を生成してください。

## 記事テンプレート・出力フォーマット（JSON）

必ず以下のJSON形式のみで回答してください：

{
  "title": "記事タイトル（80文字以内、読者の興味を引く表現で）",
  "leadText": "リード文（2〜3文、記事の概要・読者へのベネフィットを簡潔に）",
  "content": "本文（Markdownフォーマット）",
  "category": "カテゴリ（後述のリストから1つ選択）",
  "tags": "タグ（カンマ区切り、3〜5個）"
}

## 本文（content）の構成ガイドライン

- ## 見出し を使ってセクションを分ける（3〜5セクション）
- 各セクションに実践的な説明・事例・ポイントを記述
- 箇条書き（- ）を活用して読みやすく
- 教育現場での具体的な活用シーン・メリットを盛り込む
- 全体で1000〜2500文字程度

## 選択可能なカテゴリ

${ARTICLE_CATEGORIES.join(" / ")}

## 注意事項

- 日本語で記述
- 教育関係者（教員・塾講師・学校管理職・EdTech企業担当者）が対象読者
- 誇大表現・根拠のない断言は避ける
- 元のWebページの情報を元にするが、EduMatch読者向けに編集・加工して良い`;

/** PDF 以外のバイナリ（Content-Type ベースで拒否。application/octet-stream はマジックバイトで PDF 判定する） */
const NON_PDF_BINARY_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/zip",
  "application/vnd.",
  "font/",
];

const MAX_PDF_BYTES = 12 * 1024 * 1024;

function isNonPdfBinaryContentType(contentType: string): boolean {
  return NON_PDF_BINARY_PREFIXES.some((prefix) => contentType.includes(prefix));
}

function isPdfMagicBuffer(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s{2,}/g, " ").trim();
}

function extractTextFromHtml(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ");
  return normalizeWhitespace(decodeHtmlEntities(stripped));
}

function extractTextFromXml(xml: string): string {
  // CDATA セクションを中身に置換してからタグを除去
  const stripped = xml
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, " $1 ")
    .replace(/<[^>]+>/g, " ");
  return normalizeWhitespace(decodeHtmlEntities(stripped));
}

function extractTextFromJson(json: string): string {
  try {
    const data = JSON.parse(json);
    const values: string[] = [];
    function collect(obj: unknown, depth = 0): void {
      if (depth > 6) return;
      if (typeof obj === "string") { values.push(obj); return; }
      if (typeof obj === "number" || typeof obj === "boolean") { values.push(String(obj)); return; }
      if (Array.isArray(obj)) { obj.forEach((v) => collect(v, depth + 1)); return; }
      if (obj !== null && typeof obj === "object") {
        Object.values(obj as Record<string, unknown>).forEach((v) => collect(v, depth + 1));
      }
    }
    collect(data);
    return normalizeWhitespace(values.join(" "));
  } catch {
    return normalizeWhitespace(json);
  }
}

function extractTextFromContent(body: string, contentType: string): string {
  if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
    return extractTextFromHtml(body);
  }
  if (
    contentType.includes("text/xml") ||
    contentType.includes("application/xml") ||
    contentType.includes("application/rss+xml") ||
    contentType.includes("application/atom+xml")
  ) {
    return extractTextFromXml(body);
  }
  if (contentType.includes("application/json")) {
    return extractTextFromJson(body);
  }
  // text/plain, text/markdown, text/csv など
  if (contentType.startsWith("text/")) {
    return normalizeWhitespace(body);
  }
  // content-type 不明でも text として試みる
  return normalizeWhitespace(body);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI APIキーが設定されていません" },
      { status: 500 }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエスト形式が無効です" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URLが指定されていません" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "有効なURLを入力してください" }, { status: 400 });
  }

  // Fetch webpage content server-side
  let pageText: string;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EduMatch-ArticleBot/1.0; +https://edumatch.jp)",
        Accept:
          "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,application/json,text/plain,text/markdown,application/pdf,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.5",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `ページの取得に失敗しました（HTTP ${response.status}）` },
        { status: 422 }
      );
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

    if (isNonPdfBinaryContentType(contentType)) {
      return NextResponse.json(
        { error: "画像・動画・ZIPなどのバイナリには対応していません（PDFは除く）" },
        { status: 422 }
      );
    }

    const raw = Buffer.from(await response.arrayBuffer());

    const declaredPdf =
      contentType.includes("application/pdf") ||
      parsedUrl.pathname.toLowerCase().endsWith(".pdf");

    if (isPdfMagicBuffer(raw) || declaredPdf) {
      if (!isPdfMagicBuffer(raw) && declaredPdf) {
        return NextResponse.json(
          { error: "PDFとして解析できませんでした（ファイルが壊れているか、別形式の可能性があります）" },
          { status: 422 }
        );
      }
      if (raw.length > MAX_PDF_BYTES) {
        return NextResponse.json(
          { error: `PDFは${Math.floor(MAX_PDF_BYTES / (1024 * 1024))}MB以下にしてください` },
          { status: 422 }
        );
      }
      try {
        pageText = await extractTextFromPdfBuffer(raw);
      } catch (e) {
        console.error("[ai-article-generate] PDF parse error:", e);
        return NextResponse.json(
          { error: "PDFからテキストを抽出できませんでした（スキャン画像のみのPDF等は読み取れない場合があります）" },
          { status: 422 }
        );
      }
    } else {
      const body = raw.toString("utf8");
      pageText = extractTextFromContent(body, contentType);
    }

    if (pageText.length < 100) {
      return NextResponse.json(
        { error: "ページからテキストを取得できませんでした" },
        { status: 422 }
      );
    }

    // Limit to 8000 chars to stay within token budget
    if (pageText.length > 8000) {
      pageText = pageText.slice(0, 8000) + "...（以下省略）";
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "ページの読み込みがタイムアウトしました" },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "ページの取得中にエラーが発生しました" },
      { status: 422 }
    );
  }

  // Generate article with OpenAI
  try {
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下のWebページ（URL: ${parsedUrl.toString()}）の内容を元に、EduMatch向け記事を生成してください。\n\n---\n${pageText}\n---`,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: {
      title?: string;
      leadText?: string;
      content?: string;
      category?: string;
      tags?: string;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI応答の解析に失敗しました。もう一度お試しください。" },
        { status: 500 }
      );
    }

    const title = (parsed.title ?? "").slice(0, 80);
    const leadText = parsed.leadText ?? "";
    const content = parsed.content ?? "";
    const category = ARTICLE_CATEGORIES.includes(parsed.category as typeof ARTICLE_CATEGORIES[number])
      ? parsed.category!
      : "未分類";
    const tags = parsed.tags ?? "";

    if (!title || !content) {
      return NextResponse.json(
        { error: "記事の生成に失敗しました。もう一度お試しください。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ title, leadText, content, category, tags });
  } catch (err) {
    console.error("[ai-article-generate] OpenAI error:", err);
    return NextResponse.json(
      { error: "AI記事生成中にエラーが発生しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
