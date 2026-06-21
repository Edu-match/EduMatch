import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin, Users, LogIn, ChevronDown, ChevronLeft, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { applyForKaikanContents } from "@/app/_actions/kaikan";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "教育AIサミット チケット申込 | エデュマッチ",
  description: "教育AIサミット＠衆議院第一会館のコンテンツを選んで申し込み、電子チケット（QR）を受け取れます。複数まとめて申込可。",
};

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function KaikanTicketsPage() {
  const rows = await prisma.kaikanContent.findMany({
    where: { is_published: true },
    orderBy: [{ sort_order: "asc" }, { starts_at: "asc" }, { created_at: "asc" }],
    include: { _count: { select: { applications: true } } },
  }).catch(() => []);

  const profile = await getCurrentProfile().catch(() => null);
  const general = profile
    ? await prisma.generalProfile.findUnique({ where: { id: profile.id }, select: { legal_name: true, organization: true } }).catch(() => null)
    : null;
  const addr = profile
    ? await prisma.profile.findUnique({ where: { id: profile.id }, select: { postal_code: true, address: true } }).catch(() => null)
    : null;

  // 自分が申込済みのコンテンツ
  const mine = profile
    ? await prisma.kaikanApplication.findMany({ where: { profile_id: profile.id, status: { not: "cancelled" } }, select: { content_id: true } }).catch(() => [])
    : [];
  const appliedIds = new Set(mine.map((m) => m.content_id));

  const loginHref = `/login?next=${encodeURIComponent("/forum/kaikan")}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/forum?map=3d" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> 井戸端会議へ
      </Link>
      <header className="mb-5 mt-3">
        <p className="text-xs font-bold tracking-wide text-primary">教育AIサミット＠衆議院第一会館</p>
        <h1 className="mt-1 text-2xl font-bold">コンテンツ／チケット申込</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          参加したいコンテンツに<strong>複数チェック</strong>して申し込むと、1枚の電子チケット（QR）にまとめて発行されます。
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">現在申込受付中のコンテンツはありません。</div>
      ) : !profile ? (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">申込にはログインが必要です。<br />アカウントの登録情報でそのまま申し込めます。</p>
          <Link href={loginHref} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
            <LogIn className="h-4 w-4" /> ログインして申し込む
          </Link>
        </div>
      ) : (
        <form action={applyForKaikanContents} className="space-y-4">
          {/* アカウント情報トグル */}
          <details className="group rounded-xl border bg-muted/30">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">{profile.name?.charAt(0) || "?"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{profile.name}</span>
                <span className="block text-[11px] text-muted-foreground">タップして登録情報を確認</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <dl className="space-y-2 border-t px-4 py-3 text-sm">
              {[
                ["本名", general?.legal_name || profile.name],
                ["メールアドレス", profile.email],
                ["電話番号", profile.phone || "未登録"],
                ["住所", [addr?.postal_code, addr?.address].filter(Boolean).join(" ") || "未登録"],
                ["所属", general?.organization || "未登録"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </details>

          {/* コンテンツ複数選択 */}
          <ul className="space-y-2.5">
            {rows.map((c) => {
              const full = c.capacity != null && c._count.applications >= c.capacity;
              const applied = appliedIds.has(c.id);
              const disabled = full || applied;
              return (
                <li key={c.id}>
                  <label className={`flex items-start gap-3 rounded-xl border p-4 transition ${disabled ? "cursor-default bg-muted/30 opacity-70" : "cursor-pointer bg-background hover:border-primary/50 hover:bg-primary/[0.03]"}`}>
                    <input type="checkbox" name="contentId" value={c.id} disabled={disabled} defaultChecked={applied} className="mt-1 h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-bold">{c.title}</span>
                        {applied && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />申込済</span>}
                        {full && !applied && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">満席</span>}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {c.starts_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(c.starts_at)}</span>}
                        {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                        {c.capacity != null && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{c._count.applications}/{c.capacity}</span>}
                      </span>
                      {c.description && <span className="mt-1.5 block line-clamp-2 text-sm text-foreground/80">{c.description}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <button type="submit" className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
            選択したコンテンツで申し込む（電子チケットを発行）
          </button>
          <p className="text-center text-[11px] text-muted-foreground">申込済みのものはそのままチケットに含まれます。追加で選んで申し込むと同じチケットにまとまります。</p>
        </form>
      )}
    </main>
  );
}
