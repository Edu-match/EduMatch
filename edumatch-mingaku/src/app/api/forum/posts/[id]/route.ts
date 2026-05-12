import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** ピン留めトグル・非表示トグル（管理者のみ） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isPinned, isHidden } = body as {
      isPinned?: boolean;
      isHidden?: boolean;
    };

    const post = await prisma.forumPost.update({
      where: { id },
      data: {
        ...(isPinned !== undefined && { is_pinned: isPinned }),
        ...(isHidden !== undefined && { is_hidden: isHidden }),
      },
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.forumPost.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forum/posts/:id DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
