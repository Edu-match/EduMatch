import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "議員会館イベント チケット申込 | エデュマッチ",
  description: "教育AIサミット＠衆議院第一議員会館のコンテンツを選んで申し込み、電子チケット（QR）を受け取れます。",
};

type ContentCard = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: Date | null;
  capacity: number | null;
  applied: number;
};

async function getContents(): Promise<ContentCard[]> {
  try {
    const rows = await prisma.kaikanContent.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { starts_at: "asc" }, { created_at: "asc" }],
      include: { _count: { select: { applications: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      location: r.location,
      starts_at: r.starts_at,
      capacity: r.capacity,
      applied: r._count.applications,
    }));
  } catch {
    return [];
  }
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function KaikanTicketsPage() {
  const contents = await getContents();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/forum" className="text-xs text-muted-foreground hover:text-foreground">← 井戸端会議へ</Link>
      <header className="mb-6 mt-3">
        <p className="text-xs font-bold tracking-wide text-primary">井戸端会議 · 議員会館</p>
        <h1 className="mt-1 text-2xl font-bold">コンテンツ／チケット申込</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          参加したいコンテンツを選んで申し込むと、受付用の電子チケット（QRコード）が発行されます。
        </p>
      </header>

      {contents.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          現在申込受付中のコンテンツはありません。
        </div>
      ) : (
        <ul className="space-y-3">
          {contents.map((c) => {
            const full = c.capacity != null && c.applied >= c.capacity;
            return (
              <li key={c.id}>
                <Link
                  href={`/forum/kaikan/${c.id}`}
                  className="block rounded-xl border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold">{c.title}</h2>
                      {(c.starts_at || c.location) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[fmtDate(c.starts_at), c.location].filter(Boolean).join(" ・ ")}
                        </p>
                      )}
                      {c.description && <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{c.description}</p>}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                        full ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {full ? "満席" : "申込へ"}
                    </span>
                  </div>
                  {c.capacity != null && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      申込 {c.applied} / 定員 {c.capacity}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
