import Link from "next/link";
import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { KaikanViewToggle } from "@/components/kaikan/kaikan-view-toggle";
import { KaikanBackButton } from "@/components/kaikan/back-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "教育AIサミット チケット申込 | エデュマッチ",
  description: "教育AIサミット＠衆議院第一会館のコンテンツを選んで申し込み、電子チケット（QR）を受け取れます。複数まとめて申込可。",
};

export default async function KaikanTicketsPage() {
  const [rows, profile] = await Promise.all([
    prisma.kaikanContent.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { starts_at: "asc" }, { created_at: "asc" }],
      include: { _count: { select: { applications: true } } },
    }).catch(() => []),
    getCurrentProfile().catch(() => null),
  ]);

  const mine = profile
    ? await prisma.kaikanApplication.findMany({ where: { profile_id: profile.id, status: { not: "cancelled" } }, select: { content_id: true } }).catch(() => [])
    : [];
  const appliedIds = mine.map((m) => m.content_id);
  const loginHref = `/login?next=${encodeURIComponent("/forum/kaikan")}`;

  const contentProps = rows.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    location: c.location,
    startsAt: c.starts_at ? c.starts_at.toISOString() : null,
    endsAt: c.ends_at ? c.ends_at.toISOString() : null,
    capacity: c.capacity,
    applied: c._count.applications,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <KaikanBackButton />
      <header className="mb-5 mt-3">
        <p className="text-xs font-bold tracking-wide text-primary">教育AIサミット＠衆議院第一会館</p>
        <h1 className="mt-1 text-2xl font-bold">参加するコンテンツを選ぶ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          参加したいコンテンツに<strong>複数チェック</strong>して「確認へ進む」を押すと、次のページで内容を確認して申し込めます。
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
        <KaikanViewToggle
          contents={contentProps}
          appliedIds={appliedIds}
        />
      )}
    </main>
  );
}
