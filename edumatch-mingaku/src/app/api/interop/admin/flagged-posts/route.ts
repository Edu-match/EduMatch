import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** AIが自動非表示にした要確認投稿の一覧（ADMIN のみ）。
 *  PATCH/DELETE は既存の /api/interop/posts/[id] を利用（公開する/削除する）。 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const posts = await prisma.interopPost.findMany({
    where: { OR: [{ auto_flagged: true }, { is_hidden: true }], is_ai_reply: false },
    orderBy: { created_at: "desc" },
    take: 100,
    include: { subCategory: { select: { name: true, category: { select: { name: true } } } } },
  });

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      authorName: p.author_name,
      authorRole: p.author_role,
      body: p.body,
      isHidden: p.is_hidden,
      autoFlagged: p.auto_flagged,
      flagReason: p.flag_reason,
      categoryName: p.subCategory.category.name,
      subCategoryName: p.subCategory.name,
      postedAt: p.created_at.toISOString(),
    })),
  });
}
