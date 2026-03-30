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

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
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
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EduMatch-ArticleBot/1.0; +https://edumatch.jp)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: "HTMLページのみ対応しています" },
        { status: 422 }
      );
    }

    const html = await response.text();
    pageText = extractTextFromHtml(html);

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
      model: "gpt-5.2",
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
