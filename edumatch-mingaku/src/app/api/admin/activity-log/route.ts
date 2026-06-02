import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
  const targetType = searchParams.get("type") ?? "";
  const action = searchParams.get("action") ?? "";
  const search = searchParams.get("search")?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (targetType) where.target_type = targetType;
  if (action) where.action = action;
  if (search) {
    where.OR = [
      { actor_name: { contains: search, mode: "insensitive" } },
      { target_title: { contains: search, mode: "insensitive" } },
      { detail: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
      include: {
        actor: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      actor_id: l.actor_id,
      actor_name: l.actor?.name ?? l.actor_name,
      action: l.action,
      target_type: l.target_type,
      target_id: l.target_id,
      target_title: l.target_title,
      detail: l.detail,
      created_at: l.created_at.toISOString(),
      commentCount: l._count.comments,
    })),
    total,
  });
}
