import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/security";

export const dynamic = "force-dynamic";

/** 投稿整形AIのレート制限（返信系: 10回/分） */
const FORMAT_POST_RATE_LIMIT = { windowMs: 60 * 1000, max: 10 };

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimitResponse(`forum-format-post:${user.id}`, FORMAT_POST_RATE_LIMIT);
  if (rl.limited) return rl.response;

  const { content, topic } = await req.json() as { content?: string; topic?: string };
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ formatted: content });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const topicLine = topic ? `テーマ: ${topic}\n\n` : "";
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `あなたは日本語フォーラムの投稿文整形アシスタントです。
AIの回答を、実際に投稿できる自然な文章に変換します。
ルール:
- 一人称（私は・自分は等）で話し言葉らしく書く
- 150〜250字程度（必須）
- マークダウン（#・*・-など）を一切使わない
- 「AIの回答によると」「以下にまとめます」等の前置き不要
- AIの解説文ではなく、投稿者本人の意見・感想として書く
- 整形した文章だけを返す（説明不要）`,
        },
        {
          role: "user",
          content: `${topicLine}以下の内容をフォーラム投稿文に整えてください:\n\n${content.trim()}`,
        },
      ],
    });

    const formatted = completion.choices[0]?.message?.content?.trim() ?? content;
    return NextResponse.json({ formatted });
  } catch {
    return NextResponse.json({ formatted: content });
  }
}
