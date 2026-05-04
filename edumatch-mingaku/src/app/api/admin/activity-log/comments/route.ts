import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/activity-log/comments?logId=xxx
export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logId = req.nextUrl.searchParams.get("logId");
  if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });

  const comments = await prisma.activityLogComment.findMany({
    where: { log_id: logId },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({ comments: comments.map((c) => ({ ...c, created_at: c.created_at.toISOString() })) });
}

// POST /api/admin/activity-log/comments  { logId, body }
export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { logId, body } = await req.json() as { logId?: string; body?: string };
  if (!logId || !body?.trim()) {
    return NextResponse.json({ error: "logId and body required" }, { status: 400 });
  }

  const comment = await prisma.activityLogComment.create({
    data: {
      log_id: logId,
      author_id: profile.id,
      author_name: profile.name,
      body: body.trim().slice(0, 500),
    },
  });

  return NextResponse.json({ comment: { ...comment, created_at: comment.created_at.toISOString() } });
}

// DELETE /api/admin/activity-log/comments?commentId=xxx
export async function DELETE(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const commentId = req.nextUrl.searchParams.get("commentId");
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  await prisma.activityLogComment.delete({ where: { id: commentId } }).catch(() => {});
  return NextResponse.json({ success: true });
}
