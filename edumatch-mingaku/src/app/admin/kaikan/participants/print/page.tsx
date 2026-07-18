import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ParticipantsPrintButton } from "@/components/kaikan/participants-print-button";
import { KAIKAN_EVENT_NAME } from "@/lib/interop-settings";

export const dynamic = "force-dynamic";

const fmtJst = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
});

function statusLabel(s: string): string {
  if (s === "checked_in") return "受付済";
  if (s === "cancelled") return "取消";
  return "受付前";
}

/** 参加者一覧の印刷ビュー（ブラウザの印刷→PDF保存でPDFエクスポート）。 */
export default async function KaikanParticipantsPrintPage() {
  await requireAdmin();

  const apps = await prisma.kaikanApplication.findMany({
    orderBy: [{ content: { starts_at: "asc" } }, { name: "asc" }],
    include: { content: { select: { title: true, starts_at: true, location: true } } },
  });
  const active = apps.filter((a) => a.status !== "cancelled");
  const printedAt = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date());

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 print:px-0 print:py-0">
      <style>{`@media print { header, footer, nav, .no-print { display: none !important; } body { background: #fff !important; } }`}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <a href="/admin/kaikan?tab=participants" className="text-xs text-muted-foreground hover:text-foreground">← 参加者一覧に戻る</a>
        <ParticipantsPrintButton />
      </div>

      <h1 className="text-xl font-bold">{KAIKAN_EVENT_NAME} 参加者一覧</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        出力: {printedAt} ／ 有効申込 {active.length}件（キャンセル含む全{apps.length}件）
      </p>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-foreground/60 text-left">
            <th className="py-1.5 pr-2">氏名</th>
            <th className="py-1.5 pr-2">メール</th>
            <th className="py-1.5 pr-2">プログラム</th>
            <th className="py-1.5 pr-2">開始</th>
            <th className="py-1.5 pr-2">受付番号</th>
            <th className="py-1.5">状態</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => {
            const receipt = (a.ticket_token ?? a.qr_token).slice(0, 8).toUpperCase();
            return (
              <tr key={a.id} className={`border-b border-border ${a.status === "cancelled" ? "text-muted-foreground line-through" : ""}`}>
                <td className="py-1.5 pr-2 font-medium">{a.name}</td>
                <td className="py-1.5 pr-2">{a.email || "—"}</td>
                <td className="py-1.5 pr-2">{a.content?.title ?? "—"}</td>
                <td className="py-1.5 pr-2 whitespace-nowrap">{a.content?.starts_at ? fmtJst.format(a.content.starts_at) : "—"}</td>
                <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{`${receipt.slice(0, 4)}-${receipt.slice(4)}`}</td>
                <td className="py-1.5 whitespace-nowrap">{statusLabel(a.status)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
