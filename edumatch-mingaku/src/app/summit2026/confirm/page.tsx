import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin, Ticket, ChevronDown, ChevronLeft, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { applyForKaikanContents, hasRedeemedInvite } from "@/app/_actions/kaikan";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function KaikanConfirmPage({ searchParams }: { searchParams: Promise<{ ids?: string; error?: string }> }) {
  const { ids, error } = await searchParams;
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (idList.length === 0) redirect("/summit2026");

  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/summit2026/confirm?ids=${idList.join(",")}`)}`);

  // 招待コード未入力なら一覧のゲートへ
  if (!(await hasRedeemedInvite(profile.id).catch(() => false))) redirect("/summit2026?error=invite");

  const contents = await prisma.kaikanContent.findMany({
    where: { id: { in: idList }, is_published: true },
    orderBy: [{ sort_order: "asc" }, { starts_at: "asc" }],
  }).catch(() => []);
  if (contents.length === 0) notFound();

  const general = await prisma.generalProfile.findUnique({ where: { id: profile.id }, select: { legal_name: true, organization: true } }).catch(() => null);
  const addr = await prisma.profile.findUnique({ where: { id: profile.id }, select: { postal_code: true, address: true } }).catch(() => null);

  // すでに申込済みのプログラム（確認画面でも表示して全体像を分かりやすく）
  const existingApps = await prisma.kaikanApplication.findMany({
    where: { profile_id: profile.id, status: { not: "cancelled" } },
    select: { content_id: true, content: { select: { title: true, location: true, starts_at: true, sort_order: true } } },
    orderBy: { content: { sort_order: "asc" } },
  }).catch(() => []);
  const newIdSet = new Set(idList);

  const accountRows = ([
    ["表示名", profile.name],
    ["メールアドレス", profile.email],
    ...(profile.phone ? [["電話番号", profile.phone]] : []),
    ...((() => { const a = [addr?.postal_code, addr?.address].filter(Boolean).join(" "); return a ? [["住所", a]] : []; })()),
    ...(general?.organization ? [["所属", general.organization]] : []),
  ] as [string, string][]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link href="/summit2026" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> プログラム選択へ戻る
      </Link>
      <header className="mb-5 mt-3">
        <p className="text-xs font-bold tracking-wide text-primary">教育AIサミット2026＠衆議院第一議員会館</p>
        <h1 className="mt-1 text-2xl font-bold">申込内容の確認</h1>
        <p className="mt-2 text-sm text-muted-foreground">内容を確認して申し込むと、選んだ{contents.length}件をまとめた電子チケット（QR）が発行されます。</p>
      </header>

      {/* すでに申込済みのプログラム（読み取り専用・全体像の把握用） */}
      {existingApps.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">すでに申込済みのプログラム（{existingApps.length}件）</h2>
          <ul className="space-y-2">
            {existingApps.map((a) => (
              <li key={a.content_id} className="flex items-center justify-between gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{a.content.title}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    {a.content.starts_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(a.content.starts_at)}</span>}
                    {a.content.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{a.content.location}</span>}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> 申込済{newIdSet.has(a.content_id) ? "（再選択分は自動でスキップ）" : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error === "full" && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          選択されたプログラムはすべて満席または受付終了のため、お申し込みいただけませんでした。選び直してください。
        </p>
      )}

      <form action={applyForKaikanContents} className="space-y-5">
        {contents.map((c) => <input key={c.id} type="hidden" name="contentId" value={c.id} />)}

        {/* 選択したコンテンツ */}
        <section>
          <h2 className="mb-2 text-sm font-bold">今回申し込むプログラム（{contents.length}件）</h2>
          <ul className="space-y-2">
            {contents.map((c) => (
              <li key={c.id} className="rounded-xl border bg-card p-4">
                <p className="font-bold">{c.title}</p>
                {c.speaker && <p className="mt-0.5 text-[11px] text-muted-foreground">登壇者：{c.speaker}</p>}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {c.starts_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(c.starts_at)}{c.ends_at ? ` – ${fmtDate(c.ends_at)}` : ""}</span>}
                  {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* アカウント情報 */}
        <section>
          <h2 className="mb-2 text-sm font-bold">申込者情報</h2>
          <details className="group rounded-xl border bg-muted/30">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">{(general?.legal_name || profile.name)?.charAt(0) || "?"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{general?.legal_name || profile.name}</span>
                <span className="block text-[11px] text-muted-foreground">アカウントの登録情報で申し込みます・タップで詳細</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <dl className="space-y-2 border-t px-4 py-3 text-sm">
              {accountRows.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 break-all text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <input type="hidden" name="note" value="" />

        <Button type="submit" size="lg" className="w-full">
          <Ticket className="h-4 w-4" /> この内容で申し込む（電子チケットを発行）
        </Button>
      </form>
    </main>
  );
}
