import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TicketQR } from "@/components/kaikan/ticket-qr";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
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
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="bg-gradient-to-br from-primary to-violet-600 px-5 py-4 text-white">
          <p className="text-[11px] font-bold tracking-wide opacity-90">議員会館イベント 電子チケット</p>
          <h1 className="mt-0.5 text-lg font-bold">{app.content.title}</h1>
          {(app.content.starts_at || app.content.location) && (
            <p className="mt-1 text-xs opacity-90">
              {[fmtDate(app.content.starts_at), app.content.location].filter(Boolean).join(" ・ ")}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 px-5 py-6">
          <TicketQR token={token} />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">お名前</p>
            <p className="text-base font-bold">{app.name}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              checkedIn ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {checkedIn ? `受付済み${app.checked_in_at ? `（${fmtDate(app.checked_in_at)}）` : ""}` : "受付前"}
          </span>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            当日、受付でこのQRコードを提示してください。
            <br />このページのスクリーンショット保存をおすすめします。
          </p>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link href="/kaikan/tickets" className="text-xs text-muted-foreground hover:text-foreground">他のコンテンツを見る</Link>
      </div>
    </main>
  );
}
