import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** セッション一覧取得 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      mode: true,
      messages: true,
      created_at: true,
      updated_at: true,
    },
  });

  return Response.json({ sessions });
}

type SessionBody = {
  id?: string;
  title: string;
  mode: string;
  messages: unknown[];
};

/** セッション作成・更新（upsert） */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: SessionBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, title, mode, messages } = body;

  if (id) {
    // 既存セッションの更新（所有者チェック付き）
    const existing = await prisma.chatSession.findUnique({ where: { id } });
    if (!existing || existing.user_id !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await prisma.chatSession.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        mode: mode ?? existing.mode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: (messages ?? existing.messages) as any,
      },
      select: { id: true, title: true, mode: true, created_at: true, updated_at: true },
    });
    return Response.json({ session: updated });
  } else {
    // 新規セッション作成
    const created = await prisma.chatSession.create({
      data: {
        user_id: user.id,
        title: title ?? "",
        mode: mode ?? "fast",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: (messages ?? []) as any,
      },
      select: { id: true, title: true, mode: true, created_at: true, updated_at: true },
    });
    return Response.json({ session: created });
  }
}
