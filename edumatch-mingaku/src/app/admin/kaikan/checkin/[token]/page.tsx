import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaffOrAdmin } from "@/lib/auth";
import { checkInKaikanApplication } from "@/app/_actions/kaikan";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function KaikanCheckinPage({ params }: { params: Promise<{ token: string }> }) {
  await requireStaffOrAdmin();
  const { token } = await params;

  const app = await prisma.kaikanApplication.findUnique({
    where: { qr_token: token },
    select: {
      name: true,
      email: true,
      note: true,
      status: true,
      checked_in_at: true,
      content: { select: { title: true, location: true, starts_at: true } },
    },
  });
  if (!app) notFound();

  const checkedIn = app.status === "checked_in";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <Link href="/admin/kaikan" className="text-xs text-muted-foreground hover:text-foreground">← 管理に戻る</Link>
      <div className="mt-3 overflow-hidden rounded-2xl border bg-background">
        <div className={`px-5 py-4 text-white ${checkedIn ? "bg-emerald-600" : "bg-primary"}`}>
          <p className="text-[11px] font-bold tracking-wide opacity-90">受付チェックイン</p>
          <h1 className="mt-0.5 text-lg font-bold">{checkedIn ? "受付済み" : "受付確認"}</h1>
        </div>
        <div className="space-y-3 px-5 py-5">
          <div>
            <p className="text-xs text-muted-foreground">お名前</p>
            <p className="text-xl font-bold">{app.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">参加コンテンツ</p>
            <p className="font-medium">{app.content.title}</p>
            <p className="text-xs text-muted-foreground">
              {[fmtDate(app.content.starts_at), app.content.location].filter(Boolean).join(" ・ ")}
            </p>
          </div>
          {app.email && (
            <div>
              <p className="text-xs text-muted-foreground">メール</p>
              <p className="text-sm">{app.email}</p>
            </div>
          )}
          {app.note && (
            <div>
              <p className="text-xs text-muted-foreground">事前質問・期待</p>
              <p className="whitespace-pre-wrap text-sm">{app.note}</p>
            </div>
          )}

          {checkedIn ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-700">
              受付済み{app.checked_in_at ? `（${fmtDate(app.checked_in_at)}）` : ""}
            </p>
          ) : (
            <form action={checkInKaikanApplication}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
                受付完了にする
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
