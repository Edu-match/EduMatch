import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/security";

const AI_REPLY_RATE_LIMIT = { windowMs: 60 * 1000, max: 10 };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_AUTHOR_NAME = "AIアシスタント";
const AI_AUTHOR_ROLE = "AI";
const PERSONA_AUTHOR_ROLE = "AIペルソナ";
const MODEL = "gpt-5.4-mini";

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

/** 動画投稿者のAIペルソナとして返信するためのシステムプロンプトを組み立てる。 */
function buildPersonaSystemPrompt(p: {
  display_name: string;
  persona_prompt: string;
  values_text: string;
  expertise: string[];
}): string {
  return (
    `あなたはこの動画の発表者「${p.display_name}」本人のAIペルソナです。本人になりきって、視聴者コメントに返信します。\n` +
    `## あなたの人格\n${p.persona_prompt || "教育に情熱を持つ実直な人物。"}\n` +
    (p.values_text ? `## 大切にしている価値観\n${p.values_text}\n` : "") +
    (p.expertise?.length ? `## 得意分野\n${p.expertise.join("、")}\n` : "") +
    `## 返信のスタイル\n` +
    `- 投稿者の気持ち・視点をまず受け止める\n` +
    `- 動画の内容・要約と関連づけ、発表者本人の視点・経験から具体的に答える\n` +
    `- 150〜250文字程度の自然な口語。本人として話し、AIだと過度に強調しない\n` +
    `## 禁止事項\n- 宣伝・政治宗教的に偏った発言・断定的な誤情報`
  );
}

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

    // 返信系レート制限（10回/分・ユーザー単位）
    const rl = rateLimitResponse(`video-ai-reply:${user.id}`, AI_REPLY_RATE_LIMIT);
    if (rl.limited) return rl.response;

    const { id: videoId, commentId } = await params;

    // 対象コメントを取得
    const comment = await prisma.videoComment.findFirst({
      where: { id: commentId, video_id: videoId },
    });
    if (!comment) {
      return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
    }

    // 既に AI が返信済みか確認（重複防止）。AI返信は author_id=null で識別する
    // （汎用AI・AIペルソナの双方を一括で重複判定）。
    const existingAiReply = await prisma.videoComment.findFirst({
      where: {
        video_id: videoId,
        parent_id: commentId,
        author_id: null,
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

    // 動画情報を取得（AI要約・タイトルを文脈として利用、投稿者ペルソナ連動のため author_id も取得）
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { title: true, ai_summary: true, author_id: true },
    });

    // 動画投稿者のAIペルソナがあれば、本人ペルソナとして返信する（無ければ汎用AIアシスタント）。
    const authorPersona = video?.author_id
      ? await prisma.userAiPersona.findUnique({
          where: { profile_id: video.author_id },
          select: { display_name: true, persona_prompt: true, values_text: true, expertise: true, is_suspended: true },
        })
      : null;
    const usePersona = !!authorPersona && !authorPersona.is_suspended;

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

    const systemPrompt = usePersona && authorPersona
      ? buildPersonaSystemPrompt(authorPersona)
      : SYSTEM_PROMPT;
    const replyAuthorName = usePersona && authorPersona ? authorPersona.display_name : AI_AUTHOR_NAME;
    const replyAuthorRole = usePersona ? PERSONA_AUTHOR_ROLE : AI_AUTHOR_ROLE;

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: usePersona ? 0.85 : 0.75,
      max_completion_tokens: 350,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const aiBody = completion.choices[0]?.message?.content?.trim();
    if (!aiBody) {
      return NextResponse.json({ error: "AI返信の生成に失敗しました" }, { status: 502 });
    }

    // AI返信をDBに保存（author_id は null = AI。ペルソナ時は表示名/ロールを本人ペルソナに）
    const aiComment = await prisma.videoComment.create({
      data: {
        video_id: videoId,
        parent_id: commentId,
        author_id: null,
        author_name: replyAuthorName,
        author_role: replyAuthorRole,
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
