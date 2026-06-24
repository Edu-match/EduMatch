import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createKaikanContent, setKaikanContentPublished } from "@/app/_actions/kaikan";
import { KaikanCheckinPanel } from "@/components/kaikan/kaikan-checkin-panel";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function AdminKaikanPage({ searchParams }: { searchParams: Promise<{ tab?: string; token?: string }> }) {
  await requireAdmin();
  const { tab, token } = await searchParams;
  const isCheckin = tab === "checkin";

  const contents = isCheckin ? [] : await prisma.kaikanContent.findMany({
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    include: {
      _count: { select: { applications: true } },
      applications: {
        orderBy: { created_at: "desc" },
        take: 50,
        select: { id: true, name: true, email: true, status: true, qr_token: true, created_at: true },
      },
    },
  });

  const tabCls = (active: boolean) => `rounded-full px-4 py-1.5 text-sm font-bold transition ${active ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:text-foreground"}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">議員会館チケット管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">コンテンツの作成・公開と、申込者の確認・当日の受付。</p>

      {/* タブ */}
      <nav className="mt-4 flex gap-2">
        <Link href="/admin/kaikan" className={tabCls(!isCheckin)}>コンテンツ管理</Link>
        <Link href="/admin/kaikan?tab=checkin" className={tabCls(isCheckin)}>当日受付（QR/受付番号）</Link>
      </nav>

      {isCheckin ? (
        <section className="mt-6">
          <KaikanCheckinPanel initialToken={token} />
        </section>
      ) : (
      <>
      {/* コンテンツ新設 */}
      <section className="mt-6 rounded-xl border bg-background p-5">
        <h2 className="mb-3 text-sm font-bold">コンテンツを新設</h2>
        <form action={createKaikanContent} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="タイトル（必須）" className="rounded-md border border-input px-3 py-2 text-sm sm:col-span-2" />
          <textarea name="description" placeholder="説明" rows={2} className="resize-none rounded-md border border-input px-3 py-2 text-sm sm:col-span-2" />
          <input name="location" placeholder="場所（例：第一議員会館 大会議室）" className="rounded-md border border-input px-3 py-2 text-sm" />
          <input name="starts_at" type="datetime-local" className="rounded-md border border-input px-3 py-2 text-sm" />
          <input name="capacity" type="number" min={0} placeholder="定員（空欄=無制限）" className="rounded-md border border-input px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input name="is_published" type="checkbox" className="h-4 w-4" />
            すぐ公開する
          </label>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:col-span-2">作成</button>
        </form>
      </section>

      {/* コンテンツ一覧＋申込者 */}
      <section className="mt-6 space-y-4">
        {contents.length === 0 ? (
          <p className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">まだコンテンツがありません。</p>
        ) : (
          contents.map((c) => (
            <div key={c.id} className="rounded-xl border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(c.starts_at)} ・ {c.location || "場所未設定"} ・ 申込 {c._count.applications}
                    {c.capacity != null ? ` / 定員 ${c.capacity}` : ""}
                  </p>
                </div>
                <form action={setKaikanContentPublished}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="next" value={(!c.is_published).toString()} />
                  <button
                    type="submit"
                    className={`rounded-full px-3 py-1 text-xs font-bold ${c.is_published ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                  >
                    {c.is_published ? "公開中（クリックで非公開）" : "非公開（クリックで公開）"}
                  </button>
                </form>
              </div>

              {c.applications.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3">氏名</th>
                        <th className="py-1 pr-3">メール</th>
                        <th className="py-1 pr-3">状態</th>
                        <th className="py-1 pr-3">申込</th>
                        <th className="py-1">受付</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.applications.map((a) => (
                        <tr key={a.id} className="border-t">
                          <td className="py-1.5 pr-3 font-medium">{a.name}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{a.email || "—"}</td>
                          <td className="py-1.5 pr-3">
                            <span className={a.status === "checked_in" ? "text-emerald-600" : "text-amber-600"}>
                              {a.status === "checked_in" ? "受付済" : "受付前"}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{fmtDate(a.created_at)}</td>
                          <td className="py-1.5">
                            <Link href={`/admin/kaikan/checkin/${a.qr_token}`} className="text-primary underline underline-offset-2">
                              受付画面
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </section>
      </>
      )}
    </main>
  );
}
