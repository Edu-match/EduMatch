import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 議員会館イベントの申込コンテンツ一覧（公開）。3Dビュー中心ハブの“内封”表示に使う。 */
export async function GET() {
  try {
    const rows = await prisma.kaikanContent.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { starts_at: "asc" }, { created_at: "asc" }],
      include: { _count: { select: { applications: true } } },
    });
    const contents = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      location: r.location,
      startsAt: r.starts_at,
      capacity: r.capacity,
      applied: r._count.applications,
    }));
    return NextResponse.json({ contents });
  } catch (err) {
    console.error("[api/kaikan/contents GET]", err);
    return NextResponse.json({ contents: [] }, { status: 200 });
  }
}
