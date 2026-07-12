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

/** 受付番号：tokenから数字8桁を生成し 4-4 で表示。 */
function receiptNo(token: string): string {
  const hex = token.replace(/-/g, "").slice(0, 16).toLowerCase();
  const n = BigInt("0x" + hex) % BigInt(10 ** 8);
  const s = n.toString().padStart(8, "0");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export default async function KaikanTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let apps: Array<{ id: string; name: string; status: string; checked_in_at: Date | null; content: { title: string; location: string; starts_at: Date | null; sort_order: number } }> = [];
  try {
    // ticket_token でまとめて取得（旧・単独申込は qr_token でフォールバック）
    apps = await prisma.kaikanApplication.findMany({
      where: { OR: [{ ticket_token: token }, { qr_token: token }] },
      select: { id: true, name: true, status: true, checked_in_at: true, content: { select: { title: true, location: true, starts_at: true, sort_order: true } } },
    });
    apps.sort((a, b) => ((a.content?.sort_order ?? 0) - (b.content?.sort_order ?? 0)));
  } catch {
    apps = [];
  }
  if (apps.length === 0) notFound();

  const name = apps[0].name;
  const allCheckedIn = apps.every((a) => a.status === "checked_in");

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-8 sm:px-6">
      <style>{`@media print { body * { visibility: hidden !important; } #ticket-print, #ticket-print * { visibility: visible !important; } #ticket-print { position: absolute; inset: 0; margin: 24px auto; } .ticket-no-print { display: none !important; } }`}</style>
      <div id="ticket-print" className="overflow-hidden rounded-3xl border bg-card shadow-lg">
        {/* 上段：イベント */}
        <div className="bg-gradient-to-br from-primary to-violet-600 px-5 pb-5 pt-4 text-white">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide opacity-90">
            <Ticket className="h-3.5 w-3.5" /> 電子チケット
          </p>
          <h1 className="mt-1.5 text-lg font-bold leading-snug">教育AIサミット@衆議院第一会館</h1>
          <p className="mt-1 text-xs opacity-90">{apps.length}件のプログラムに参加</p>
        </div>

        {/* ミシン目 */}
        <div className="relative h-0 border-t border-dashed border-border">
          <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
          <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
        </div>

        {/* QR・受付番号・氏名 */}
        <div className="flex flex-col items-center gap-4 px-5 py-6">
          <TicketQR token={token} />
          <div className="w-full rounded-xl border bg-muted/30 px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-muted-foreground">受付番号</p>
            <p className="mt-0.5 font-mono text-2xl font-black tracking-widest text-foreground">{receiptNo(token)}</p>
          </div>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">お名前</p>
              <p className="truncate text-base font-bold">{name}</p>
            </div>
            {allCheckedIn && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> 受付済</span>}
          </div>

          {/* 参加プログラム（セッション単位の受付状況） */}
          <div className="w-full">
            <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">参加プログラム</p>
            <ul className="space-y-2">
              {apps.map((a) => {
                const done = a.status === "checked_in";
                return (
                  <li key={a.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{a.content.title}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          {a.content.starts_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(a.content.starts_at)}</span>}
                          {a.content.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{a.content.location}</span>}
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{done ? "受付済" : "受付前"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            当日、受付でこのQRコードまたは受付番号を提示してください。<br />スクリーンショットの保存をおすすめします。
          </p>
        </div>
      </div>

      <div className="ticket-no-print mt-4 flex flex-col items-center gap-3">
        <TicketPrintButton />
        <Link href="/forum/kaikan" className="text-xs text-muted-foreground hover:text-foreground">コンテンツ一覧へ</Link>
      </div>
    </main>
  );
}
