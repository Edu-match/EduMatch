import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  fetchContentCandidates,
  type ContentCandidate,
} from "@/lib/forum-category-content-ai";
import { categoryRoomId, getOrCreateCategoryRoom } from "@/lib/forum-category-room";

export const dynamic = "force-dynamic";

type PinInput = {
  sourceType: string;
  sourceId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  href: string;
  meta?: string | null;
};

async function resolveFace(categorySlug: string, subSlug: string) {
  const [category, subCategory] = await Promise.all([
    prisma.forumCategory.findUnique({ where: { slug: categorySlug } }),
    prisma.forumSubCategory.findUnique({ where: { slug: subSlug } }),
  ]);
  return { category, subCategory };
}

/** 面の固定コンテンツ・炎上書き・固定候補を返す（管理者専用） */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const categorySlug = url.searchParams.get("categorySlug");
  const subSlug = url.searchParams.get("subSlug");
  if (!categorySlug || !subSlug) {
    return NextResponse.json({ error: "categorySlug and subSlug are required" }, { status: 400 });
  }

  const { category, subCategory } = await resolveFace(categorySlug, subSlug);
  if (!category || !subCategory) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [pinnedRows, room, candidates] = await Promise.all([
    prisma.forumPinnedContent.findMany({
      where: { category_id: category.id, sub_category_id: subCategory.id },
      orderBy: [{ rank_order: "asc" }, { created_at: "asc" }],
    }),
    prisma.forumRoom.findUnique({
      where: { id: categoryRoomId(categorySlug, subSlug) },
      select: { hot_override: true },
    }),
    subCategory.content_kind === "community"
      ? Promise.resolve<ContentCandidate[]>([])
      : fetchContentCandidates(subCategory.content_kind, 60),
  ]);

  return NextResponse.json({
    contentKind: subCategory.content_kind,
    hotOverride: room?.hot_override ?? null,
    pinned: pinnedRows.map((r) => ({
      sourceType: r.source_type,
      sourceId: r.source_id,
      title: r.title,
      description: r.description,
      thumbnailUrl: r.thumbnail_url,
      href: r.href,
      meta: r.meta,
    })),
    candidates: candidates.map((c) => ({
      sourceType: c.sourceType,
      sourceId: c.id,
      title: c.title,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl,
      href: c.href,
      meta: c.meta ?? null,
    })),
  });
}

/** 面の固定コンテンツ・炎上書きを保存（総入れ替え。管理者専用） */
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    categorySlug?: string;
    subSlug?: string;
    pinned?: PinInput[];
    hotOverride?: boolean | null;
  };
  const { categorySlug, subSlug } = body;
  if (!categorySlug || !subSlug) {
    return NextResponse.json({ error: "categorySlug and subSlug are required" }, { status: 400 });
  }

  const { category, subCategory } = await resolveFace(categorySlug, subSlug);
  if (!category || !subCategory) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 炎マークの手動上書きは面のルーム（cat-<cat>--<sub>）に保存（無ければ作成）
  await getOrCreateCategoryRoom(categorySlug, subSlug);
  await prisma.forumRoom.update({
    where: { id: categoryRoomId(categorySlug, subSlug) },
    data: { hot_override: body.hotOverride ?? null },
  });

  // 固定コンテンツは総入れ替え（最大12件、表示順=配列順）
  const items = Array.isArray(body.pinned) ? body.pinned.slice(0, 12) : [];
  await prisma.$transaction([
    prisma.forumPinnedContent.deleteMany({
      where: { category_id: category.id, sub_category_id: subCategory.id },
    }),
    ...items.map((it, i) =>
      prisma.forumPinnedContent.create({
        data: {
          category_id: category.id,
          sub_category_id: subCategory.id,
          content_kind: subCategory.content_kind,
          source_type: it.sourceType,
          source_id: it.sourceId,
          title: it.title,
          description: it.description ?? "",
          thumbnail_url: it.thumbnailUrl ?? null,
          href: it.href,
          meta: it.meta ?? null,
          rank_order: i,
        },
      })
    ),
  ]);

  return NextResponse.json({
    ok: true,
    pinnedCount: items.length,
    hotOverride: body.hotOverride ?? null,
  });
}
