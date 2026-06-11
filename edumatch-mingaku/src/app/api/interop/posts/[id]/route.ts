import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 投稿の編集（本文・固定・非表示）。ADMIN のみ。 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    body?: string;
    isPinned?: boolean;
    isHidden?: boolean;
  };

  const data: { body?: string; is_pinned?: boolean; is_hidden?: boolean; auto_flagged?: boolean } = {};
  if (typeof body.body === "string" && body.body.trim()) data.body = body.body.trim().slice(0, 1000);
  if (typeof body.isPinned === "boolean") data.is_pinned = body.isPinned;
  if (typeof body.isHidden === "boolean") {
    data.is_hidden = body.isHidden;
    // 管理者が公開（非表示解除）したらAI要確認フラグも下ろす（レビュー完了）
    if (body.isHidden === false) data.auto_flagged = false;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  }

  try {
    const post = await prisma.interopPost.update({ where: { id }, data });
    return NextResponse.json({
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
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** 投稿の削除。ADMIN のみ。 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.interopPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
