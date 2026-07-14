import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createKaikanContent, setKaikanContentPublished, generateKaikanInviteCodes, toggleKaikanInviteCode, deleteKaikanInviteCode, importKaikanContentsFromCsv } from "@/app/_actions/kaikan";
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
  const isInvites = tab === "invites";
  const isParticipants = tab === "participants";

  const inviteCodes = isInvites ? await prisma.kaikanInviteCode.findMany({
    orderBy: { created_at: "desc" },
    take: 1000,
    select: { id: true, code: true, note: true, is_active: true, redeemed_by: true, redeemed_at: true, created_at: true, _count: { select: { redemptions: true } } },
  }) : [];

  const participants = isParticipants ? await prisma.kaikanApplication.findMany({
    orderBy: { created_at: "desc" },
    include: { content: { select: { title: true, starts_at: true } } },
    take: 2000,
  }) : [];
  const inviteStats = isInvites ? {
    total: await prisma.kaikanInviteCode.count(),
    usedCount: await prisma.kaikanInviteRedemption.count(),
  } : { total: 0, usedCount: 0 };

  const contents = (isCheckin || isInvites || isParticipants) ? [] : await prisma.kaikanContent.findMany({
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
      <nav className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/kaikan" className={tabCls(!isCheckin && !isInvites && !isParticipants)}>コンテンツ管理</Link>
        <Link href="/admin/kaikan?tab=checkin" className={tabCls(isCheckin)}>当日受付（QR/受付番号）</Link>
        <Link href="/admin/kaikan?tab=invites" className={tabCls(isInvites)}>招待コード</Link>
        <Link href="/admin/kaikan?tab=participants" className={tabCls(isParticipants)}>参加者一覧</Link>
      </nav>

      {isCheckin ? (
        <section className="mt-6">
          <KaikanCheckinPanel initialToken={token} />
        </section>
      ) : isInvites ? (
        <section className="mt-6 space-y-6">
          <div className="rounded-xl border bg-background p-5">
            <h2 className="mb-1 text-sm font-bold">招待コードを生成</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              イベント参加者に配布する共通コードです。1つのコードを複数人で使用できます。
            </p>
            <form action={generateKaikanInviteCodes} className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="block text-xs text-muted-foreground">生成枚数（最大500）</span>
                <input name="count" type="number" min={1} max={500} defaultValue={20} className="mt-1 w-32 rounded-md border border-input px-3 py-2 text-sm" />
              </label>
              <label className="text-sm flex-1 min-w-[180px]">
                <span className="block text-xs text-muted-foreground">メモ（任意・一括付与）</span>
                <input name="note" placeholder="例：6/28分" className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">生成</button>
            </form>
          </div>

          <div className="rounded-xl border bg-background p-5">
            <h2 className="mb-3 text-sm font-bold">発行済みコード（{inviteStats.total}件、合計{inviteStats.usedCount}人使用）</h2>
            {inviteCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだコードがありません。上で生成してください。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3">コード</th>
                      <th className="py-1 pr-3">メモ</th>
                      <th className="py-1 pr-3">状態</th>
                      <th className="py-1 pr-3">発行日</th>
                      <th className="py-1 pr-3">有効/無効</th>
                      <th className="py-1">削除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inviteCodes.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="py-1.5 pr-3 font-mono font-bold tracking-wider">{c.code}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{c.note || "—"}</td>
                        <td className="py-1.5 pr-3">
                          <span className={c._count.redemptions > 0 ? "text-muted-foreground" : "text-emerald-600 font-bold"}>
                            {c._count.redemptions > 0 ? `${c._count.redemptions}人使用` : "未使用"}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                        <td className="py-1.5 pr-3">
                          <form action={toggleKaikanInviteCode} className="inline">
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="next" value={(!c.is_active).toString()} />
                            <button type="submit" className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                              {c.is_active ? "有効" : "無効"}
                            </button>
                          </form>
                        </td>
                        <td className="py-1.5">
                          <form action={deleteKaikanInviteCode} className="inline">
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="text-[10px] text-destructive hover:underline">削除</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : isParticipants ? (
      <section className="mt-6">
        <div className="rounded-xl border bg-background p-5">
          <h2 className="mb-3 text-sm font-bold">参加者一覧（{participants.length}件）</h2>
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ参加申込がありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">氏名</th>
                    <th className="py-1 pr-3">メール</th>
                    <th className="py-1 pr-3">コンテンツ</th>
                    <th className="py-1 pr-3">状態</th>
                    <th className="py-1">申込日時</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{p.email || "—"}</td>
                      <td className="py-1.5 pr-3">{p.content?.title || "—"}</td>
                      <td className="py-1.5 pr-3">
                        <span className={p.status === "checked_in" ? "text-emerald-600" : "text-amber-600"}>
                          {p.status === "checked_in" ? "受付済" : p.status === "cancelled" ? "取消" : "受付前"}
                        </span>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      ) : (
      <>
      {/* CSV一括インポート */}
      <section className="mt-6 rounded-xl border bg-background p-5">
        <h2 className="mb-1 text-sm font-bold">CSVで一括インポート</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          <a href="/kaikan-content-template.csv" download className="text-primary underline">テンプレートCSV</a>をダウンロードして記入後、アップロードしてください。
        </p>
        <form action={importKaikanContentsFromCsv} className="flex items-end gap-2">
          <input name="csv" type="file" accept=".csv" required className="text-sm" />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">インポート</button>
        </form>
      </section>

      {/* コンテンツ新設 */}
      <section className="mt-6 rounded-xl border bg-background p-5">
        <h2 className="mb-3 text-sm font-bold">コンテンツを新設</h2>
        <form action={createKaikanContent} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="タイトル（必須）" className="rounded-md border border-input px-3 py-2 text-sm sm:col-span-2" />
          <textarea name="description" placeholder="説明" rows={2} className="resize-none rounded-md border border-input px-3 py-2 text-sm sm:col-span-2" />
          <input name="location" placeholder="場所（例：第一議員会館 大会議室）" className="rounded-md border border-input px-3 py-2 text-sm sm:col-span-2" />
          <label className="text-xs text-muted-foreground">開始<input name="starts_at" type="datetime-local" className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" /></label>
          <label className="text-xs text-muted-foreground">終了（時間重複の判定に使用）<input name="ends_at" type="datetime-local" className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" /></label>
          <input name="capacity" type="number" min={0} placeholder="定員（空欄=無制限）" className="rounded-md border border-input px-3 py-2 text-sm" />
          <label className="text-xs text-muted-foreground">種別
            <select name="content_type" className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
              <option value="session">セッション</option>
              <option value="workshop">ワークショップ</option>
              <option value="keynote">基調講演</option>
            </select>
          </label>
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
                    {fmtDate(c.starts_at)}{c.ends_at ? `–${fmtDate(c.ends_at)}` : ""} ・ {c.location || "場所未設定"} ・ 申込 {c._count.applications}
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
                <details className="mt-3 rounded-lg border bg-muted/20">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-foreground/80 hover:bg-muted/40">
                    申込者一覧を表示（{c._count.applications}名）
                  </summary>
                  <div className="overflow-x-auto px-3 pb-3">
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
                </details>
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
