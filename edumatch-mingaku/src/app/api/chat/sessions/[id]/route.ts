import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** セッション削除 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.chatSession.findUnique({ where: { id } });
  if (!existing || existing.user_id !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chatSession.delete({ where: { id } });
  return Response.json({ success: true });
}
