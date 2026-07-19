import Link from "next/link";
import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { hasRedeemedInvite } from "@/app/_actions/kaikan";
import { KaikanViewToggle } from "@/components/kaikan/kaikan-view-toggle";
import { KaikanBackButton } from "@/components/kaikan/back-button";
import { InviteCodeGate } from "@/components/kaikan/invite-code-gate";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "教育AIサミット2026＠衆議院第一議員会館 チケット申込 | AIUEO BASE",
  description: "教育AIサミット2026＠衆議院第一議員会館のコンテンツを選んで申し込み、電子チケット（QR）を受け取れます。複数まとめてお申し込みいただけます。",
};

export default async function KaikanTicketsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [rows, profile] = await Promise.all([
    prisma.kaikanContent.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { starts_at: "asc" }, { created_at: "asc" }],
      include: { _count: { select: { applications: { where: { status: { not: "cancelled" } } } } } },
    }).catch(() => []),
    getCurrentProfile().catch(() => null),
  ]);

  const mine = profile
    ? await prisma.kaikanApplication.findMany({ where: { profile_id: profile.id, status: { not: "cancelled" } }, select: { content_id: true, ticket_token: true, qr_token: true } }).catch(() => [])
    : [];
  const appliedIds = mine.map((m) => m.content_id);
  const myTicketToken = mine.find((m) => m.ticket_token)?.ticket_token ?? mine[0]?.qr_token ?? null;
  const invited = profile ? await hasRedeemedInvite(profile.id).catch(() => false) : false;
  const loginHref = `/login?next=${encodeURIComponent("/summit2026")}`;

  // 懇親会（content_type=social）は通常セッションと分け、最上部に目立つカードで表示する。
  const socialRow = rows.find((c) => c.content_type === "social") ?? null;
  const socialApplied = socialRow?._count.applications ?? 0;
  const socialFull = socialRow?.capacity != null && socialApplied >= socialRow.capacity;
  const socialAppliedByMe = socialRow ? appliedIds.includes(socialRow.id) : false;

  const contentProps = rows
    .filter((c) => c.content_type !== "social")
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      location: c.location,
      speaker: c.speaker,
      startsAt: c.starts_at ? c.starts_at.toISOString() : null,
      endsAt: c.ends_at ? c.ends_at.toISOString() : null,
      capacity: c.capacity,
      applied: c._count.applications,
    }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <KaikanBackButton href="/" label="トップへ戻る" />
      <header className="mb-5 mt-3">
        <p className="text-xs font-bold tracking-wide text-primary">教育AIサミット2026＠衆議院第一議員会館</p>
        <h1 className="mt-1 text-2xl font-bold">参加するプログラムを選ぶ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          参加したいプログラムに<strong>チェック</strong>して「確認へ進む」を押すと、次のページで内容を確認して申し込めます。
        </p>
        {myTicketToken && (
          <Link
            href={`/summit2026/ticket/${myTicketToken}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10"
          >
            マイチケットを表示（申込済{appliedIds.length}件）
          </Link>
        )}
      </header>

      {/* 懇親会（最上部・目立つカード）: ログイン済み かつ 招待コード入力済みのときのみ表示 */}
      {socialRow && profile && invited && (
        <section className="mb-5 overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.07] via-background to-violet-500/[0.06] p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">懇親会</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">先着40名</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">参加費 5,000円（税込・当日現金払い）</span>
            {socialFull && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">満席</span>}
          </div>
          <h2 className="mt-2.5 text-lg font-bold">{socialRow.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{socialRow.description}</p>
          <div className="mt-3.5">
            {socialAppliedByMe ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">申込済み</span>
            ) : socialFull ? (
              <Button disabled>満席</Button>
            ) : (
              <Button asChild><Link href={`/summit2026/confirm?ids=${socialRow.id}`}>懇親会に申し込む</Link></Button>
            )}
          </div>
        </section>
      )}

      {error === "invite" && !invited && (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          お申し込みには招待コードの入力が必要です。
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">現在申込受付中のプログラムはありません。</div>
      ) : !profile ? (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">お申し込みにはログインが必要です。<br />アカウントの登録情報でそのまま申し込めます。</p>
          <Button asChild size="lg" className="mt-4">
            <Link href={loginHref}>
              <LogIn className="h-4 w-4" /> ログインして申し込む
            </Link>
          </Button>
        </div>
      ) : !invited ? (
        <InviteCodeGate />
      ) : (
        <KaikanViewToggle
          contents={contentProps}
          appliedIds={appliedIds}
        />
      )}
    </main>
  );
}
