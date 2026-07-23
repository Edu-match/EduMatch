import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generatePersonaReplyText } from "@/lib/persona-reply";
import { revalidatePath } from "next/cache";

const AI_REVIEW_ROLE = "AI";
const AI_PERSONA_REVIEW_ROLE = "AIペルソナ";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_AUTHOR_NAME = "AIファシリテーター";
const GENERIC_MODEL = "gpt-5.4-mini";

const GENERIC_SYSTEM = `あなたは日本の教育コミュニティ「教育のひろば」のAIファシリテーターです。
記事に寄せられた口コミに対して、記事の内容を踏まえて建設的に返信します。

## 返信のスタイル
- 投稿者の視点や気持ちをまず受け止める
- 記事の論点と関連づけた具体的なコメントを添える
- 教育的な視点から補足や、対話を前に進める問いかけを加える
- 120〜220文字程度の自然な口語
## 禁止事項
- 特定商品の宣伝・政治宗教的に偏った発言・断定的な誤情報
- 説明や前置きは書かず、返信本文だけを出力する`;

/**
 * 記事の口コミに対して AI が返信する。
 * 記事著者に AIペルソナがあれば「著者本人のペルソナ」として、無ければ汎用AIファシリテーターとして返信。
 * user_id=null で AI 返信を識別し、口コミごとに1件だけ生成（重複防止）。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "AI設定が未構成です" }, { status: 503 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const { id: postId, reviewId } = await params;

    // 対象の口コミ（トップレベル）を取得
    const review = await prisma.review.findFirst({
      where: { id: reviewId, post_id: postId, parent_id: null },
      select: { id: true, author_name: true, author_role: true, body: true },
    });
    if (!review) return NextResponse.json({ error: "口コミが見つかりません" }, { status: 404 });

    // 既に AI 返信済みなら再生成しない（user_id=null で汎用AI・ペルソナ双方を判定）
    const existing = await prisma.review.findFirst({
      where: { post_id: postId, parent_id: reviewId, user_id: null },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ alreadyExists: true, replyId: existing.id });
    }

    // 記事情報＋著者ペルソナ
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { title: true, summary: true, content: true, provider_id: true },
    });
    if (!post) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });

    const authorPersona = post.provider_id
      ? await prisma.userAiPersona.findUnique({
          where: { profile_id: post.provider_id },
          select: {
            display_name: true,
            persona_prompt: true,
            values_text: true,
            expertise: true,
            is_suspended: true,
          },
        })
      : null;
    const usePersona = !!authorPersona && !authorPersona.is_suspended;

    // 文脈：同記事の直近口コミ（最大4件・古い順）
    const recent = await prisma.review.findMany({
      where: { post_id: postId, parent_id: null, is_approved: true },
      orderBy: { created_at: "desc" },
      take: 4,
      select: { author_name: true, body: true },
    });
    const recentPosts = recent
      .reverse()
      .map((r) => ({ authorName: r.author_name, body: r.body }));

    const knowledge = (post.summary || post.content || "").slice(0, 1200);

    let body: string | null = null;
    let authorName = AI_AUTHOR_NAME;
    let authorRole: string = AI_REVIEW_ROLE;

    if (usePersona && authorPersona) {
      // 記事著者本人のAIペルソナとして返信（persona-reply を再利用）
      body = await generatePersonaReplyText({
        displayName: authorPersona.display_name,
        personaPrompt: authorPersona.persona_prompt,
        valuesText: authorPersona.values_text ?? undefined,
        expertise: authorPersona.expertise ?? undefined,
        postBody: review.body,
        categoryName: "記事の口コミ",
        subCategoryName: post.title,
        recentPosts,
        knowledgeContext: knowledge,
      });
      authorName = authorPersona.display_name.startsWith("AI") ? authorPersona.display_name : `AI${authorPersona.display_name}`;
      authorRole = AI_PERSONA_REVIEW_ROLE;
    } else {
      // 汎用 AI ファシリテーター
      const openai = new OpenAI({ apiKey });
      const contextLines = recentPosts.map((p) => `【${p.authorName}】${p.body}`).join("\n");
      const userMessage = [
        `## 記事タイトル\n${post.title}`,
        knowledge ? `\n## 記事の要点\n${knowledge}` : "",
        contextLines ? `\n## 最近の口コミ（参考）\n${contextLines}` : "",
        `\n## 返信する口コミ\n【${review.author_name}${review.author_role ? `（${review.author_role}）` : ""}】\n${review.body}`,
        "\n上記の口コミに、教育のひろばのファシリテーターとして建設的に返信してください。",
      ]
        .filter(Boolean)
        .join("\n")
        .trim();

      const completion = await openai.chat.completions.create({
        model: GENERIC_MODEL,
        temperature: 0.75,
        max_completion_tokens: 350,
        messages: [
          { role: "system", content: GENERIC_SYSTEM },
          { role: "user", content: userMessage },
        ],
      });
      body = completion.choices[0]?.message?.content?.trim() ?? null;
    }

    if (!body) return NextResponse.json({ error: "AI返信の生成に失敗しました" }, { status: 502 });

    const reply = await prisma.review.create({
      data: {
        post_id: postId,
        parent_id: reviewId,
        user_id: null,
        author_name: authorName,
        author_role: authorRole,
        body,
        is_approved: true,
      },
      select: { id: true, author_name: true, author_role: true, body: true, created_at: true },
    });

    revalidatePath(`/articles/${postId}`);
    return NextResponse.json(
      {
        reply: {
          id: reply.id,
          author_name: reply.author_name,
          author_role: reply.author_role,
          body: reply.body,
          created_at: reply.created_at.toISOString(),
          is_ai: true,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[articles/:id/reviews/:reviewId/ai-reply POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
