import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { moderateAndNotify } from "@/lib/post-moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const MAX_BODY = 1000;

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
        ...(includeHidden ? {} : { is_hidden: false }),
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
      select: { id: true },
    });
    if (!sub) {
      return NextResponse.json({ error: "サブカテゴリが見つかりません" }, { status: 404 });
    }

    const authorName = (body.authorName?.trim() || "匿名").slice(0, 40);
    const authorRole = (body.authorRole?.trim() ?? "").slice(0, 60);

    const user = await getCurrentUser().catch(() => null);
    const profile = user ? await getCurrentProfile().catch(() => null) : null;
    const isAdmin = profile?.role === "ADMIN";
    // 固定（記事化）は管理者のみ。管理者の投稿はモデレーションをスキップする。
    const isPinned = isAdmin && body.isPinned === true;

    if (!isAdmin) {
      // モデレーション（ベストエフォート）：APIキー未設定など skipped の場合は許可。
      // 明確に不適切と判定された場合のみ拒否する。
      const url = new URL(req.url);
      const origin = `${url.protocol}//${url.host}`;
      const moderation = await moderateAndNotify({
        text,
        kind: "comment",
        featureLabel: "Interop特設掲示板",
        userId: user?.id ?? "guest",
        userName: profile?.name || authorName,
        contextUrl: `${origin}/interop`,
      }).catch(() => null);

      if (moderation && !moderation.skipped && !moderation.allowed) {
        return NextResponse.json(
          { error: "この内容は掲示板のガイドラインに適合しないため投稿できません。表現を見直してください。" },
          { status: 400 }
        );
      }
    }

    const post = await prisma.interopPost.create({
      data: {
        sub_category_id: body.subCategoryId,
        author_name: authorName,
        author_role: authorRole,
        body: text,
        is_pinned: isPinned,
      },
    });

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
