import Link from "next/link";
import { getSiteUpdates } from "@/app/_actions/site-updates";
import { getCurrentUserRole } from "@/app/_actions/user";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function SiteUpdateSection() {
  const [siteUpdates, role] = await Promise.all([
    getSiteUpdates(10),
    getCurrentUserRole(),
  ]);
  const isAdmin = role === "ADMIN";

  if (siteUpdates.length > 0) {
    return (
      <section className="border rounded-lg bg-card">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">運営からのお知らせ</h2>
          {isAdmin && (
            <Link
              href="/admin/site-updates/new"
              className="text-sm text-primary hover:underline font-medium whitespace-nowrap"
            >
              投稿する
            </Link>
          )}
        </div>
        <ul className="divide-y">
          {siteUpdates.map((item) => (
            <li key={item.id}>
              <Link
                href={item.link || `/site-updates/${item.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 hover:bg-muted/50 transition-colors block"
                {...(item.link ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <span className="text-xs text-muted-foreground flex-shrink-0 sm:w-24">
                  {formatDate(item.published_at)}
                </span>
                <span className="text-sm font-medium line-clamp-2 hover:text-primary">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="p-3 border-t text-center">
          {isAdmin ? (
            <Link href="/admin/site-updates" className="text-sm text-primary hover:underline font-medium">
              運営記事を管理
            </Link>
          ) : (
            <Link href="/articles" className="text-sm text-primary hover:underline font-medium">
              記事一覧を見る
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="border rounded-lg bg-card p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold">運営からのお知らせ</h2>
        {isAdmin && (
          <Link
            href="/admin/site-updates/new"
            className="text-sm text-primary hover:underline font-medium whitespace-nowrap"
          >
            投稿する
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">更新情報はまだありません</p>
    </section>
  );
}
