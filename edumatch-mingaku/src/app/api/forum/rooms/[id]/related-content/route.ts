import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import {
  fetchContentCandidates,
  pickCategoryContentWithAI,
  type ContentCandidate,
} from "@/lib/forum-category-content-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  href: string;
  meta: string | null;
  rankOrder: number;
};

/** 部屋に紐付いた関連コンテンツ一覧（公開・部屋ページ上部に表示） */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;
    const rows = await prisma.forumRoomContent.findMany({
      where: { room_id: roomId },
      orderBy: [{ rank_order: "asc" }, { created_at: "asc" }],
    });
    const items: Item[] = rows.map((r) => ({
      id: r.id,
      sourceType: r.source_type,
      sourceId: r.source_id,
      title: r.title,
      description: r.description,
      thumbnailUrl: r.thumbnail_url,
      href: r.href,
      meta: r.meta,
      rankOrder: r.rank_order,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[forum/rooms/related-content GET]", err);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

const candidateToPayload = (c: ContentCandidate) => ({
  sourceType: c.sourceType,
  sourceId: c.id,
  title: c.title,
  description: c.description,
  thumbnailUrl: c.thumbnailUrl,
  href: c.href,
  meta: c.meta ?? null,
});

/** 管理者操作: AI自動検索 / キーワード検索 / 追加 / 削除 / 並び替え */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getCurrentProfile().catch(() => null);
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id: roomId } = await params;
    const room = await prisma.forumRoom.findUnique({ where: { id: roomId }, select: { name: true, description: true } });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const body = await req.json();
    const action = body.action as string;

    // ── 候補プール（記事＋サービス）──
    if (action === "ai-search" || action === "search") {
      const [articles, services] = await Promise.all([
        fetchContentCandidates("article").catch(() => [] as ContentCandidate[]),
        fetchContentCandidates("service").catch(() => [] as ContentCandidate[]),
      ]);
      const pool = [...articles, ...services];

      if (action === "search") {
        const q = String(body.q ?? "").trim().toLowerCase();
        const filtered = q
          ? pool.filter((c) => `${c.title} ${c.description} ${(c.tags ?? []).join(" ")}`.toLowerCase().includes(q))
          : pool;
        return NextResponse.json({ results: filtered.slice(0, 40).map(candidateToPayload) });
      }

      // ai-search: 部屋名・説明をテーマにAIで関連度の高い順に選定
      const picks = await pickCategoryContentWithAI({
        categoryName: room.name,
        categoryDescription: room.description,
        subCategoryName: "関連コンテンツ",
        contentKind: "article",
        candidates: pool,
        limit: 8,
      });
      return NextResponse.json({ results: picks.map(candidateToPayload) });
    }

    if (action === "add") {
      const c = body.item as ReturnType<typeof candidateToPayload>;
      if (!c?.sourceType || !c?.sourceId || !c?.title || !c?.href) {
        return NextResponse.json({ error: "invalid item" }, { status: 400 });
      }
      const maxRow = await prisma.forumRoomContent.aggregate({ where: { room_id: roomId }, _max: { rank_order: true } });
      const nextRank = (maxRow._max.rank_order ?? -1) + 1;
      const created = await prisma.forumRoomContent.upsert({
        where: { room_id_source_type_source_id: { room_id: roomId, source_type: c.sourceType, source_id: c.sourceId } },
        update: { title: c.title, description: c.description ?? "", thumbnail_url: c.thumbnailUrl ?? null, href: c.href, meta: c.meta ?? null },
        create: {
          room_id: roomId,
          source_type: c.sourceType,
          source_id: c.sourceId,
          title: c.title,
          description: c.description ?? "",
          thumbnail_url: c.thumbnailUrl ?? null,
          href: c.href,
          meta: c.meta ?? null,
          rank_order: nextRank,
        },
      });
      return NextResponse.json({ ok: true, id: created.id });
    }

    if (action === "remove") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      await prisma.forumRoomContent.deleteMany({ where: { id, room_id: roomId } });
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder") {
      const ids = (body.ids ?? []) as string[];
      await prisma.$transaction(
        ids.map((id, i) =>
          prisma.forumRoomContent.updateMany({ where: { id, room_id: roomId }, data: { rank_order: i } })
        )
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[forum/rooms/related-content POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
