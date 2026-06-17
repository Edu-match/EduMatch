import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { applyForKaikanContent } from "@/app/_actions/kaikan";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function KaikanApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let content: Awaited<ReturnType<typeof prisma.kaikanContent.findUnique>> | null = null;
  try {
    content = await prisma.kaikanContent.findUnique({ where: { id } });
  } catch {
    content = null;
  }
  if (!content || !content.is_published) notFound();

  let applied = 0;
  try {
    applied = await prisma.kaikanApplication.count({ where: { content_id: id, status: { not: "cancelled" } } });
  } catch {
    applied = 0;
  }
  const full = content.capacity != null && applied >= content.capacity;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link href="/kaikan/tickets" className="text-xs text-muted-foreground hover:text-foreground">← コンテンツ一覧へ</Link>
      <header className="mt-3 mb-5">
        <h1 className="text-2xl font-bold">{content.title}</h1>
        {(content.starts_at || content.location) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[fmtDate(content.starts_at), content.location].filter(Boolean).join(" ・ ")}
          </p>
        )}
        {content.description && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/85">{content.description}</p>}
      </header>

      {full ? (
        <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          申込は定員に達しました。
        </div>
      ) : (
        <form action={applyForKaikanContent} className="space-y-4 rounded-xl border bg-background p-5">
          <input type="hidden" name="contentId" value={content.id} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">お名前 <span className="text-red-500">*</span></label>
            <input name="name" required maxLength={60} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="山田 太郎" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">メールアドレス <span className="text-muted-foreground">（任意）</span></label>
            <input name="email" type="email" maxLength={120} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">事前質問・期待すること <span className="text-muted-foreground">（任意）</span></label>
            <textarea name="note" rows={3} maxLength={500} className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="登壇者に聞きたいこと、参加への期待など" />
          </div>
          <button type="submit" className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
            この内容で申し込む（電子チケットを発行）
          </button>
          <p className="text-[11px] text-muted-foreground">
            申込後、受付で提示するQRコードが表示されます。スクリーンショットの保存をおすすめします。
          </p>
        </form>
      )}
    </main>
  );
}
