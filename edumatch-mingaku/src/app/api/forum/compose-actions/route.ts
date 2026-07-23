import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

type ComposeAction = { emoji: string; label: string; prompt: string };

function defaultActions(topic: string): ComposeAction[] {
  const t = topic ? `「${topic}」` : "このテーマ";
  return [
    { emoji: "💡", label: "自分の意見を出す", prompt: `${t}について、私が思う一番大切なことと、その理由を教えてください。私の言葉として投稿できる文章を作ってください。` },
    { emoji: "🔄", label: "別の切り口で", prompt: `${t}について、あまり語られない視点や意外な切り口から、投稿できる意見文を書いてください。` },
    { emoji: "✍️", label: "投稿文に整える", prompt: `これまでの内容をもとに、井戸端会議に投稿できる文章を書いてください。150〜250字、一人称・話し言葉で自然に。マークダウン不使用。` },
  ];
}

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic") ?? "";
  if (!topic.trim()) {
    return NextResponse.json({ actions: defaultActions("") });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ actions: defaultActions(topic) });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: "日本語の教育系フォーラム用クイックアクションボタンを生成します。JSONのみ返答。",
        },
        {
          role: "user",
          content: `テーマ「${topic}」について、ユーザーが自分の意見を書きやすくなる投稿サポートボタンを3つ作ってください。

重要: AIに質問させるボタンではなく「ユーザー自身の意見・体験・感想を引き出す」ボタンにしてください。
プロンプトは「私の意見として〜を書いて」「〜の投稿文を書いて」のように、ユーザーの代わりに投稿文を生成する指示にしてください。

以下のJSON配列のみを返してください（説明・コードブロック不要）:
[
  {"emoji": "絵文字", "label": "ボタン名（8字以内）", "prompt": "AIへの指示（投稿文生成を頼む1文）"},
  {"emoji": "絵文字", "label": "ボタン名（8字以内）", "prompt": "AIへの指示（別の切り口で投稿文生成）"},
  {"emoji": "✍️", "label": "投稿文に整える", "prompt": "これまでの内容をもとに、井戸端会議に投稿できる文章を書いてください。150〜250字、一人称・話し言葉で自然に。マークダウン不使用。"}
]

- 1つ目: 体験談・感想・推し意見など自分事化する切り口
- 2つ目: 課題・疑問・比較・別視点など掘り下げる切り口
- 3つ目: 必ず上記の "✍️ 投稿文に整える" で固定`,
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
