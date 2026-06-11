import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { moderateAndNotify } from "@/lib/post-moderation";
import { generateInteropAiReplyText, INTEROP_AI_FACILITATOR_NAME } from "@/lib/forum-ai-comment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const MAX_BODY = 1000;
/** 新規投稿にAI返信を付ける確率（全体の約8割に返信が付くように） */
const AI_REPLY_PROBABILITY = 0.8;

/** サブカテゴリ掲示板の投稿一覧（公開）
 *  ?subCategoryId=xxx 必須。
 */
export async function GET(req: NextRequest) {
  try {
    const subCategoryId = req.nextUrl.searchParams.get("subCategoryId");
    if (!subCategoryId) {
      return NextResponse.json({ error: "subCategoryId is required" }, { status: 400 });
    }

    // includeHidden=true は管理者のみ（非表示投稿も含めて返す）
    let includeHidden = false;
    if (req.nextUrl.searchParams.get("includeHidden") === "true") {
      const profile = await getCurrentProfile().catch(() => null);
      includeHidden = profile?.role === "ADMIN";
    }

    const posts = await prisma.interopPost.findMany({
      where: {
        sub_category_id: subCategoryId,
        is_ai_reply: false,
        parent_post_id: null,
        ...(includeHidden ? {} : { is_hidden: false }),
      },
      include: {
        replies: {
          where: { is_ai_reply: true },
          take: 1,
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      take: PAGE_SIZE,
    });
    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        subCategoryId: p.sub_category_id,
        authorName: p.author_name,
        authorRole: p.author_role,
        body: p.body,
        isPinned: p.is_pinned,
        isHidden: p.is_hidden,
        postedAt: p.created_at.toISOString(),
        aiReply: p.replies[0]
          ? { body: p.replies[0].body, postedAt: p.replies[0].created_at.toISOString() }
          : null,
      })),
    });
  } catch (err) {
    console.error("[interop/posts GET]", err);
    return NextResponse.json({ posts: [], error: "Internal server error" }, { status: 200 });
  }
}

/** 投稿作成（来場者向け・ログイン不要） */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      subCategoryId?: string;
      authorName?: string;
      authorRole?: string;
      postBody?: string;
      /** 管理者のみ：運営のお知らせ・記事として上部に固定する */
      isPinned?: boolean;
    };

    if (!body.subCategoryId) {
      return NextResponse.json({ error: "subCategoryId is required" }, { status: 400 });
    }
    const text = body.postBody?.trim();
    if (!text) {
      return NextResponse.json({ error: "本文を入力してください" }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: `本文は${MAX_BODY}文字以内で入力してください` }, { status: 400 });
    }

    const sub = await prisma.interopSubCategory.findUnique({
      where: { id: body.subCategoryId },
      select: { id: true, name: true, category: { select: { name: true } } },
    });
    if (!sub) {
      return NextResponse.json({ error: "サブカテゴリが見つかりません" }, { status: 404 });
    }

    const authorName = body.authorName?.trim() ?? "";
    const authorRole = body.authorRole?.trim() ?? "";
    if (!authorName) {
      return NextResponse.json({ error: "ニックネームを入力してください" }, { status: 400 });
    }
    if (authorName === "匿名" || authorName === "匿名ユーザー") {
      return NextResponse.json({ error: "匿名での投稿はできません" }, { status: 400 });
    }
    if (!authorRole || authorRole === "匿名" || authorRole === "一般") {
      return NextResponse.json({ error: "肩書きを入力してください" }, { status: 400 });
    }
    const trimmedName = authorName.slice(0, 40);
    const trimmedRole = authorRole.slice(0, 60);

    const user = await getCurrentUser().catch(() => null);
    const profile = user ? await getCurrentProfile().catch(() => null) : null;
    const isAdmin = profile?.role === "ADMIN";
    // 固定（記事化）は管理者のみ。管理者の投稿はモデレーションをスキップする。
    const isPinned = isAdmin && body.isPinned === true;

    // AIモデレーション：危険・不適切と判定された投稿は「拒否」ではなく
    // 自動で非表示(is_hidden)＋フラグ(auto_flagged)にして保存し、管理画面で確認・解除できるようにする。
    let autoHidden = false;
    let flagReason = "";
    if (!isAdmin) {
      const url = new URL(req.url);
      const origin = `${url.protocol}//${url.host}`;
      const moderation = await moderateAndNotify({
        text,
        kind: "comment",
        featureLabel: "Interop特設掲示板",
        userId: user?.id ?? "guest",
        userName: profile?.name || trimmedName,
        contextUrl: `${origin}/interop`,
      }).catch(() => null);

      if (moderation && !moderation.skipped && !moderation.allowed) {
        autoHidden = true;
        flagReason = moderation.slackSummaryJa || "AIが不適切の可能性を検知";
      }
    }

    const post = await prisma.interopPost.create({
      data: {
        sub_category_id: body.subCategoryId,
        author_name: trimmedName,
        author_role: trimmedRole,
        body: text,
        is_pinned: isPinned,
        is_hidden: autoHidden,
        auto_flagged: autoHidden,
        flag_reason: flagReason,
      },
    });

    // 自動非表示になった場合は、投稿者には「確認中」と伝える（理由は晒さない）
    if (autoHidden) {
      return NextResponse.json(
        {
          pendingReview: true,
          message: "投稿ありがとうございます。内容を確認のうえ公開されます。",
        },
        { status: 202 }
      );
    }

    // AIファシリテーター返信：運営の固定投稿以外に、約8割の確率で生成する。
    // レスポンスはブロックせず after() で送信後に実行（Vercel Fluid Compute で確実に走る）。
    if (!isPinned && !autoHidden && Math.random() < AI_REPLY_PROBABILITY) {
      const createdPostId = post.id;
      const subCategoryId = sub.id;
      const subName = sub.name;
      const catName = sub.category.name;
      const postBody = text;
      after(async () => {
        try {
          const recent = await prisma.interopPost.findMany({
            where: {
              sub_category_id: subCategoryId,
              is_hidden: false,
              is_ai_reply: false,
              parent_post_id: null,
              id: { not: createdPostId },
            },
            orderBy: { created_at: "desc" },
            take: 3,
            select: { author_name: true, body: true },
          });
          const replyText = await generateInteropAiReplyText({
            postBody,
            subCategoryName: subName,
            categoryName: catName,
            recentPosts: recent.map((r) => ({ authorName: r.author_name, body: r.body })),
          });
          if (!replyText) return;
          await prisma.interopPost.create({
            data: {
              sub_category_id: subCategoryId,
              parent_post_id: createdPostId,
              is_ai_reply: true,
              author_name: INTEROP_AI_FACILITATOR_NAME,
              author_role: "AIファシリテーター",
              body: replyText,
            },
          });
        } catch (e) {
          console.error("[interop/posts] AI reply generation failed", e);
        }
      });
    }

    return NextResponse.json(
      {
        post: {
          id: post.id,
          subCategoryId: post.sub_category_id,
          authorName: post.author_name,
          authorRole: post.author_role,
          body: post.body,
          isPinned: post.is_pinned,
          isHidden: post.is_hidden,
          postedAt: post.created_at.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[interop/posts POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
