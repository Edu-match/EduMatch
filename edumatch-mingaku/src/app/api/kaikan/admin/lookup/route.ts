import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 当日受付：QR(ticket_token) もしくは受付番号でチケットを照会。ユーザー情報＋参加セッション一覧を返す。 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = (req.nextUrl.searchParams.get("token") || "").trim();
  if (!raw) return NextResponse.json({ error: "トークンを入力してください" }, { status: 400 });
  const norm = raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  try {
    const first = await prisma.kaikanApplication.findFirst({
      where: { OR: [{ ticket_token: raw }, { qr_token: raw }, { ticket_token: { startsWith: norm } }, { qr_token: { startsWith: norm } }] },
      select: { ticket_token: true, qr_token: true, profile_id: true, name: true, email: true },
    });
    if (!first) return NextResponse.json({ found: false }, { status: 200 });

    const groupToken = first.ticket_token ?? first.qr_token;
    const apps = await prisma.kaikanApplication.findMany({
      where: { OR: [{ ticket_token: groupToken }, { qr_token: groupToken }] },
      select: {
        id: true, status: true, checked_in_at: true,
        content: { select: { title: true, location: true, starts_at: true, sort_order: true } },
      },
    });
    apps.sort((a, b) => (a.content?.sort_order ?? 0) - (b.content?.sort_order ?? 0));

    let phone: string | null = null;
    let address: string | null = null;
    let postal: string | null = null;
    if (first.profile_id) {
      const p = await prisma.profile.findUnique({ where: { id: first.profile_id }, select: { phone: true, address: true, postal_code: true } });
      phone = p?.phone ?? null; address = p?.address ?? null; postal = p?.postal_code ?? null;
    }

    return NextResponse.json({
      found: true,
      ticketToken: groupToken,
      user: { name: first.name, email: first.email, phone, address, postal },
      sessions: apps.map((a) => ({
        id: a.id,
        title: a.content?.title ?? "",
        location: a.content?.location ?? "",
        startsAt: a.content?.starts_at ?? null,
        status: a.status,
        checkedInAt: a.checked_in_at,
      })),
    });
  } catch (err) {
    console.error("[api/kaikan/admin/lookup GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** セッション単位で受付（チェックイン）。{ applicationId } を受け取り status=checked_in に。 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { applicationId?: string };
  const id = (body.applicationId || "").trim();
  if (!id) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  try {
    const app = await prisma.kaikanApplication.findUnique({
      where: { id },
      select: { id: true, status: true, checked_in_at: true },
    });
    if (!app) return NextResponse.json({ error: "申込が見つかりません" }, { status: 404 });

    // 二重受付防止：既に受付済みなら上書きせず、初回の受付時刻を返す。
    if (app.status === "checked_in") {
      return NextResponse.json({
        ok: true,
        alreadyCheckedIn: true,
        session: { id: app.id, status: app.status, checkedInAt: app.checked_in_at },
      });
    }

    const updated = await prisma.kaikanApplication.update({
      where: { id },
      data: { status: "checked_in", checked_in_at: new Date() },
      select: { id: true, status: true, checked_in_at: true },
    });
    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: false,
      session: { id: updated.id, status: updated.status, checkedInAt: updated.checked_in_at },
    });
  } catch (err) {
    console.error("[api/kaikan/admin/lookup POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
