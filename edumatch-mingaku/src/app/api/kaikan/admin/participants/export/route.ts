import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fmtJst = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit",
});

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function statusLabel(s: string): string {
  if (s === "checked_in") return "受付済";
  if (s === "cancelled") return "キャンセル";
  return "受付前";
}

/** 管理者：参加者一覧のCSVエクスポート（全件・Excel対応BOM付きUTF-8）。 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const apps = await prisma.kaikanApplication.findMany({
      orderBy: [{ created_at: "asc" }],
      include: { content: { select: { title: true, starts_at: true, location: true } } },
    });

    const header = ["申込日時", "氏名", "メール", "プログラム", "開始時刻", "会場", "状態", "受付時刻", "受付番号", "事前質問・期待"];
    const rows = apps.map((a) => {
      const receipt = (a.ticket_token ?? a.qr_token).slice(0, 8).toUpperCase();
      return [
        fmtJst.format(a.created_at),
        a.name,
        a.email,
        a.content?.title ?? "",
        a.content?.starts_at ? fmtJst.format(a.content.starts_at) : "",
        a.content?.location ?? "",
        statusLabel(a.status),
        a.checked_in_at ? fmtJst.format(a.checked_in_at) : "",
        `${receipt.slice(0, 4)}-${receipt.slice(4)}`,
        a.note,
      ].map(csvCell).join(",");
    });

    // BOM付きでExcelの文字化けを防ぐ
    const csv = "\uFEFF" + [header.map(csvCell).join(","), ...rows].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kaikan-participants-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("[api/kaikan/admin/participants/export GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
