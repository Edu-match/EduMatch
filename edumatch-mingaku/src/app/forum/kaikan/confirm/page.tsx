import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin, Ticket, ChevronDown, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { applyForKaikanContents, hasRedeemedInvite } from "@/app/_actions/kaikan";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function KaikanConfirmPage({ searchParams }: { searchParams: Promise<{ ids?: string; error?: string }> }) {
  const { ids, error } = await searchParams;
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (idList.length === 0) redirect("/forum/kaikan");

  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/forum/kaikan/confirm?ids=${idList.join(",")}`)}`);

  // 招待コード未入力なら一覧のゲートへ
  if (!(await hasRedeemedInvite(profile.id).catch(() => false))) redirect("/forum/kaikan?error=invite");

  const contents = await prisma.kaikanContent.findMany({
    where: { id: { in: idList }, is_published: true },
    orderBy: [{ sort_order: "asc" }, { starts_at: "asc" }],
  }).catch(() => []);
  if (contents.length === 0) notFound();

  const general = await prisma.generalProfile.findUnique({ where: { id: profile.id }, select: { legal_name: true, organization: true } }).catch(() => null);
  const addr = await prisma.profile.findUnique({ where: { id: profile.id }, select: { postal_code: true, address: true } }).catch(() => null);

  const accountRows = ([
    ["表示名", profile.name],
    ["メールアドレス", profile.email],
    ...(profile.phone ? [["電話番号", profile.phone]] : []),
    ...((() => { const a = [addr?.postal_code, addr?.address].filter(Boolean).join(" "); return a ? [["住所", a]] : []; })()),
    ...(general?.organization ? [["所属", general.organization]] : []),
  ] as [string, string][]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link href="/forum/kaikan" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> コンテンツ選択へ戻る
      </Link>
      <header className="mb-5 mt-3">
        <p className="text-xs font-bold tracking-wide text-primary">教育AIサミット2026＠衆議院第一議員会館</p>
        <h1 className="mt-1 text-2xl font-bold">申込内容の確認</h1>
        <p className="mt-2 text-sm text-muted-foreground">内容を確認して申し込むと、選んだ{contents.length}件をまとめた電子チケット（QR）が発行されます。</p>
      </header>

      {error === "full" && (
        <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          選択されたプログラムはすべて満員または受付終了のため、お申し込みいただけませんでした。選び直してください。
        </p>
      )}

      <form action={applyForKaikanContents} className="space-y-5">
        {contents.map((c) => <input key={c.id} type="hidden" name="contentId" value={c.id} />)}

        {/* 選択したコンテンツ */}
        <section>
          <h2 className="mb-2 text-sm font-bold">参加コンテンツ（{contents.length}件）</h2>
          <ul className="space-y-2">
            {contents.map((c) => (
              <li key={c.id} className="rounded-xl border bg-card p-4">
                <p className="font-bold">{c.title}</p>
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
                  <dd className="min-w-0 text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">事前質問・期待すること <span className="text-muted-foreground">（任意・全コンテンツ共通）</span></label>
          <textarea name="note" rows={3} maxLength={500} className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="登壇者に聞きたいこと、参加への期待など" />
        </div>

        <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
          <Ticket className="h-4 w-4" /> この内容で申し込む（電子チケットを発行）
        </button>
      </form>
    </main>
  );
}
