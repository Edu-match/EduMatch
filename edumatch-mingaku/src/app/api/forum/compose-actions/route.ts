import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

type ComposeAction = { emoji: string; label: string; prompt: string };

function defaultActions(topic: string): ComposeAction[] {
  return [
    { emoji: "💡", label: "論点を整理", prompt: `テーマ「${topic}」の論点を3つに整理し、それぞれの視点から考えてください。` },
    { emoji: "🔄", label: "反対視点チェック", prompt: `テーマ「${topic}」で想定される反対意見・懸念点を3つ挙げ、改善案も示してください。` },
    { emoji: "✍️", label: "投稿文に整える", prompt: `投稿しやすい文体に整えてください。150〜250字の投稿文と短いタイトル案を1つください。` },
  ];
}

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic") ?? "";
  if (!topic.trim()) {
    return NextResponse.json({ actions: defaultActions("このテーマ") });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ actions: defaultActions(topic) });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: "You generate quick action button configs for a Japanese education forum. Output only valid JSON, no markdown.",
        },
        {
          role: "user",
          content: `テーマ「${topic}」の投稿作成を支援するクイックアクションボタンを3つ生成してください。

以下のJSON配列のみを返してください（説明・コードブロック不要）:
[
  {"emoji": "絵文字", "label": "ボタンラベル（8字以内）", "prompt": "AIへの指示文（1文）"},
  {"emoji": "絵文字", "label": "ボタンラベル（8字以内）", "prompt": "AIへの指示文（1文）"},
  {"emoji": "✍️", "label": "投稿文に整える", "prompt": "投稿しやすい文体に整えてください。150〜250字の投稿文と短いタイトル案を1つください。"}
]

- 1〜2つ目: テーマ「${topic}」に特化したアクション（体験談・比較・課題整理・メリット/デメリット等）
- 3つ目: 必ず "✍️ 投稿文に整える" で固定`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as ComposeAction[];
      if (Array.isArray(parsed) && parsed.length >= 2 && parsed.every((a) => a.emoji && a.label && a.prompt)) {
        return NextResponse.json({ actions: parsed.slice(0, 3) });
      }
    }
  } catch {
    // fall through to default
  }

  return NextResponse.json({ actions: defaultActions(topic) });
}
