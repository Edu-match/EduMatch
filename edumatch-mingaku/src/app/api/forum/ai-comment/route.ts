import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type RequestBody = {
  postBody: string;
  roomName: string;
  weeklyTopic: string;
  /** これまでの投稿一覧（文脈として渡す） */
  recentPosts?: { authorName: string; body: string }[];
};

const SYSTEM_PROMPT = `あなたは「AIUEO井戸端会議」というオンラインコミュニティに参加するAIファシリテーターです。
教育現場の実践者・研究者・保護者・企業が集まるフォーラムで、議論を豊かにするサポートをしています。

## あなたの役割
- 投稿者の意見・経験を**まず肯定・共感**して受け止める
- 多様な視点（教員/保護者/行政/研究者/海外事例など）を補足して議論を広げる
- 具体的な事例・データ・問いかけで会話のキャッチボールを促す
- 「次にどんな意見が出るか」を引き出す問いで締めくくる
- 長くなりすぎず、**200〜350文字程度**で自然な会話トーンを保つ
- 「AI」であることを最初に一言添えても良いが、過度に強調しない

## 禁止事項
- 正解を断言しない（「〜が正解です」は使わない）
- 特定の製品・サービスの宣伝
- 政治的に偏った発言`;

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { postBody, roomName, weeklyTopic, recentPosts = [] } = body;

    if (!postBody?.trim()) {
      return NextResponse.json({ error: "postBody is required" }, { status: 400 });
    }

    // 直近の投稿コンテキスト（最大3件）
    const contextLines = recentPosts
      .slice(-3)
      .map((p) => `【${p.authorName}】${p.body}`)
      .join("\n");

    const userMessage = `
## 部屋：${roomName}
## 今週のお題：${weeklyTopic}
${contextLines ? `\n## 最近の投稿（参考）\n${contextLines}\n` : ""}
## 新しい投稿
${postBody}

上記の投稿に対して、ファシリテーターとして自然な返信をしてください。
`.trim();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 400,
      temperature: 0.85,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    // Server-Sent Events でストリーミング返却
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[forum/ai-comment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
