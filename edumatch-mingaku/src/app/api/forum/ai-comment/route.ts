import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { verifyOrigin, getClientIp, rateLimitResponse } from "@/lib/security";

const AI_COMMENT_RATE_LIMIT = { windowMs: 60 * 1000, max: 10 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const requestBodySchema = z.object({
  postBody: z.string().max(10000),
  roomName: z.string().max(200).default(""),
  /** ルーム・カテゴリの議論テーマ（説明文やカテゴリ名など） */
  roomContext: z.string().max(2000).optional(),
  /** @deprecated 旧クライアント互換 */
  weeklyTopic: z.string().max(2000).optional(),
  /** これまでの投稿一覧（文脈として渡す） */
  recentPosts: z
    .array(
      z.object({
        authorName: z.string().max(100),
        body: z.string().max(10000),
      })
    )
    .max(30)
    .optional(),
});

const SYSTEM_PROMPT = `あなたは「AIUEO教育のひろば」というオンラインコミュニティに参加するAIファシリテーターです。
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
  const rl = rateLimitResponse(`forum-ai-comment:${getClientIp(req)}`, AI_COMMENT_RATE_LIMIT);
  if (rl.limited) return rl.response;

  const csrf = verifyOrigin(req);
  if (csrf) return csrf;

  try {
    const parsed = requestBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const body = parsed.data;
    const { postBody, roomName, recentPosts = [] } = body;
    const roomContext = (body.roomContext ?? body.weeklyTopic ?? "").trim();

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
${roomContext ? `## 議論のテーマ：${roomContext}` : ""}
${contextLines ? `\n## 最近の投稿（参考）\n${contextLines}\n` : ""}
## 新しい投稿
${postBody}

上記の投稿に対して、ファシリテーターとして自然な返信をしてください。
`.trim();

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
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
