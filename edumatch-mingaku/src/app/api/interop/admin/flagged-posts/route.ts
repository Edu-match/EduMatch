import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 投稿一覧（ADMIN のみ）。
 *  既定は「AI自動非表示・非表示中」の要確認投稿のみ。
 *  ?all=1 を付けると AI返信を除く全投稿を返し、任意の投稿を表示/非表示にできる。
 *  PATCH/DELETE は既存の /api/interop/posts/[id] を利用（表示/非表示/削除）。 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const all = new URL(req.url).searchParams.get("all") === "1";

  const posts = await prisma.interopPost.findMany({
    where: all
      ? { is_ai_reply: false }
      : { OR: [{ auto_flagged: true }, { is_hidden: true }], is_ai_reply: false },
    orderBy: { created_at: "desc" },
    take: all ? 300 : 100,
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
