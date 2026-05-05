import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitUserReport } from "@/lib/user-report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  targetType: z.enum(["post", "reply"]),
  targetId: z.string().min(1),
  reasonCode: z.enum([
    "HARASSMENT",
    "SPAM",
    "INAPPROPRIATE",
    "PRIVACY",
    "OTHER",
  ]),
  detail: z.string().max(4000).optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  const { targetType, targetId, reasonCode, detail } = parsed.data;

  if (targetType === "post") {
    const post = await prisma.forumPost.findUnique({
      where: { id: targetId },
      select: { id: true, author_id: true, body: true },
    });
    if (!post) {
      return NextResponse.json({ error: "投稿が見つかりません。" }, { status: 404 });
    }
    if (!post.author_id) {
      return NextResponse.json(
        { error: "この投稿は匿名のため報告できません。" },
        { status: 400 }
      );
    }
    const result = await submitUserReport({
      reporterId: user.id,
      reportedUserId: post.author_id,
      reasonCode,
      detail: detail ?? null,
      contextKind: "forum_post",
      contextExcerpt: post.body,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, reportId: result.reportId });
  }

  const reply = await prisma.forumReply.findUnique({
    where: { id: targetId },
    select: { id: true, author_id: true, body: true },
  });
  if (!reply) {
    return NextResponse.json({ error: "返信が見つかりません。" }, { status: 404 });
  }
  if (!reply.author_id) {
    return NextResponse.json(
      { error: "この返信は匿名のため報告できません。" },
      { status: 400 }
    );
  }
  const result = await submitUserReport({
    reporterId: user.id,
    reportedUserId: reply.author_id,
    reasonCode,
    detail: detail ?? null,
    contextKind: "forum_reply",
    contextExcerpt: reply.body,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, reportId: result.reportId });
}
