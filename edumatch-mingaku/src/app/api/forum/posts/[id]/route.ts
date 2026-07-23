import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/app/_actions/activity-log";
import { verifyOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const patchBodySchema = z.object({
  isPinned: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

/** ピン留めトグル・非表示トグル（管理者のみ） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyOrigin(req);
  if (csrf) return csrf;

  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = patchBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { isPinned, isHidden } = parsed.data;

    const post = await prisma.forumPost.update({
      where: { id },
      data: {
        ...(isPinned !== undefined && { is_pinned: isPinned }),
        ...(isHidden !== undefined && { is_hidden: isHidden }),
      },
    });

    const action = isHidden === true ? "HIDE" : isHidden === false ? "SHOW" : "UPDATE";
    const detail = isPinned !== undefined
      ? (isPinned ? "投稿を注目に設定" : "投稿の注目を解除")
      : isHidden !== undefined
        ? (isHidden ? "投稿を非表示" : "投稿を再表示")
        : "投稿設定を更新";
    void logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action,
      targetType: "FORUM_POST",
      targetId: id,
      targetTitle: post.body.slice(0, 80),
      detail,
    });

    return NextResponse.json({
      post: {
        id: post.id,
        isPinned: post.is_pinned,
        isHidden: post.is_hidden,
      },
    });
  } catch (err) {
    console.error("[forum/posts/:id PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** 投稿削除（管理者のみ） */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyOrigin(req);
  if (csrf) return csrf;

  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const post = await prisma.forumPost.findUnique({ where: { id }, select: { body: true } });
    await prisma.forumPost.delete({ where: { id } });
    void logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: "DELETE",
      targetType: "FORUM_POST",
      targetId: id,
      targetTitle: post?.body.slice(0, 80) ?? id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forum/posts/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
