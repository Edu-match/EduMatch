import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_AUTHOR_NAME = "AIアシスタント";
const AI_AUTHOR_ROLE = "AI";
const MODEL = "gpt-5.4";

const SYSTEM_PROMPT = `あなたは日本の教育関係者向け動画プラットフォームのAIアシスタントです。
視聴者のコメントに対して、動画の内容を踏まえながら丁寧に返信してください。

## 返信のスタイル
- 投稿者の気持ちや視点をまず受け止める
- 動画の内容・要約と関連づけた具体的なコメントを添える
- 教育的な視点から補足情報や関連する問いかけを加える
- 自然な会話トーンで、親しみやすく
- 150〜250文字程度でまとめる

## 禁止事項
- 特定の商品・サービスの宣伝
- 政治的・宗教的な偏った発言
- 断定的な誤情報の提供`;

/**
 * ユーザーコメントに対して AI が自動返信する。
 * ログイン済みであることを確認し、対象コメントの親 ID として AI コメントを保存する。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI設定が未構成です" }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { id: videoId, commentId } = await params;

    // 対象コメントを取得
    const comment = await prisma.videoComment.findFirst({
      where: { id: commentId, video_id: videoId },
    });
    if (!comment) {
      return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
    }

    // 既に AI が返信済みか確認（重複防止）
    const existingAiReply = await prisma.videoComment.findFirst({
      where: {
        video_id: videoId,
        parent_id: commentId,
        author_role: AI_AUTHOR_ROLE,
      },
    });
    if (existingAiReply) {
      return NextResponse.json({
        comment: {
          id: existingAiReply.id,
          videoId: existingAiReply.video_id,
          parentId: existingAiReply.parent_id,
          authorName: existingAiReply.author_name,
          authorRole: existingAiReply.author_role,
          body: existingAiReply.body,
          isHidden: existingAiReply.is_hidden,
          postedAt: existingAiReply.created_at.toISOString(),
          replies: [],
        },
        alreadyExists: true,
      });
    }

    // 動画情報を取得（AI要約・タイトルを文脈として利用）
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { title: true, ai_summary: true },
    });

    // 直近のコメントを文脈として取得（最大4件）
    const recentComments = await prisma.videoComment.findMany({
      where: { video_id: videoId, is_hidden: false, parent_id: null },
      orderBy: { created_at: "desc" },
      take: 4,
      select: { author_name: true, body: true },
    });

    const contextLines = recentComments
      .reverse()
      .filter((c) => c.author_name !== AI_AUTHOR_NAME)
      .map((c) => `【${c.author_name}】${c.body}`)
      .join("\n");

    const userMessage = [
      `## 動画タイトル`,
      video?.title ?? "（不明）",
      video?.ai_summary ? `\n## 動画の要約\n${video.ai_summary}` : "",
      contextLines ? `\n## 最近のコメント（参考）\n${contextLines}` : "",
      `\n## 返信するコメント`,
      `【${comment.author_name}（${comment.author_role}）】`,
      comment.body,
      "\n上記のコメントに対して、自然で教育的な視点を交えた返信をしてください。",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.75,
      max_completion_tokens: 350,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const aiBody = completion.choices[0]?.message?.content?.trim();
    if (!aiBody) {
      return NextResponse.json({ error: "AI返信の生成に失敗しました" }, { status: 502 });
    }

    // AI返信をDBに保存（author_id は null = AI）
    const aiComment = await prisma.videoComment.create({
      data: {
        video_id: videoId,
        parent_id: commentId,
        author_id: null,
        author_name: AI_AUTHOR_NAME,
        author_role: AI_AUTHOR_ROLE,
        body: aiBody,
      },
    });

    return NextResponse.json(
      {
        comment: {
          id: aiComment.id,
          videoId: aiComment.video_id,
          parentId: aiComment.parent_id,
          authorName: aiComment.author_name,
          authorRole: aiComment.author_role,
          body: aiComment.body,
          isHidden: aiComment.is_hidden,
          postedAt: aiComment.created_at.toISOString(),
          replies: [],
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[videos/:id/comments/:commentId/ai-reply POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
