import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Ticket, CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TicketQR } from "@/components/kaikan/ticket-qr";
import { TicketPrintButton } from "@/components/kaikan/ticket-print-button";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** 受付番号：tokenの先頭8桁を 4-4 で見やすく。 */
function receiptNo(token: string): string {
  const s = token.slice(0, 8).toUpperCase();
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export default async function KaikanTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let app: { name: string; status: string; checked_in_at: Date | null; content: { title: string; location: string; starts_at: Date | null } } | null = null;
  try {
    app = await prisma.kaikanApplication.findUnique({
      where: { qr_token: token },
      select: {
        name: true,
        status: true,
        checked_in_at: true,
        content: { select: { title: true, location: true, starts_at: true } },
      },
    });
  } catch {
    app = null;
  }
  if (!app) notFound();

  const checkedIn = app.status === "checked_in";

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8 sm:px-6">
      {/* 印刷時はチケットカード(#ticket-print)だけ表示 */}
      <style>{`@media print { body * { visibility: hidden !important; } #ticket-print, #ticket-print * { visibility: visible !important; } #ticket-print { position: absolute; inset: 0; margin: 24px auto; } .ticket-no-print { display: none !important; } }`}</style>
      <div id="ticket-print" className="overflow-hidden rounded-3xl border bg-card shadow-lg">
        {/* チケット上段：イベント情報 */}
        <div className="relative bg-gradient-to-br from-primary to-violet-600 px-5 pb-5 pt-4 text-white">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide opacity-90">
            <Ticket className="h-3.5 w-3.5" /> 議員会館イベント 電子チケット
          </p>
          <h1 className="mt-1.5 text-lg font-bold leading-snug">{app.content.title}</h1>
          <div className="mt-2 space-y-1 text-xs opacity-90">
            {app.content.starts_at && <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(app.content.starts_at)}</p>}
            {app.content.location && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{app.content.location}</p>}
          </div>
        </div>

        {/* ミシン目 */}
        <div className="relative h-0 border-t border-dashed border-border">
          <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
          <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
        </div>

        {/* チケット下段：QR・受付番号・氏名 */}
        <div className="flex flex-col items-center gap-4 px-5 py-6">
          <TicketQR token={token} />

          <div className="w-full rounded-xl border bg-muted/30 px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-muted-foreground">受付番号</p>
            <p className="mt-0.5 font-mono text-2xl font-black tracking-widest text-foreground">{receiptNo(token)}</p>
          </div>

          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">お名前</p>
              <p className="truncate text-base font-bold">{app.name}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${checkedIn ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {checkedIn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {checkedIn ? `受付済み${app.checked_in_at ? `（${fmtDate(app.checked_in_at)}）` : ""}` : "受付前"}
            </span>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            当日、受付でこのQRコードを提示してください。<br />スクリーンショットの保存をおすすめします。
          </p>
        </div>
      </div>

      <div className="ticket-no-print mt-4 flex flex-col items-center gap-3">
        <TicketPrintButton />
        <Link href="/forum?map=3d" className="text-xs text-muted-foreground hover:text-foreground">他のコンテンツを見る</Link>
      </div>
    </main>
  );
}
