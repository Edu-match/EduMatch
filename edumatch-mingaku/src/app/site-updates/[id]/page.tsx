import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getSiteUpdateById } from "@/app/_actions/site-updates";
import { notFound } from "next/navigation";
import { ContentRenderer } from "@/components/ui/content-renderer";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function SiteUpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  unstable_noStore();
  const { id } = await params;
  const item = await getSiteUpdateById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            トップに戻る
          </Link>
        </Button>
      </div>

      <article className="max-w-3xl mx-auto">
        <header className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            {formatDate(item.published_at)}
            {item.category && ` · ${item.category}`}
          </p>
          <h1 className="text-2xl font-bold">{item.title}</h1>
        </header>

        {item.body && (
          <div className="prose prose-slate max-w-none dark:prose-invert">
            {item.body.trimStart().startsWith("<") ? (
              <div dangerouslySetInnerHTML={{ __html: item.body }} />
            ) : (
              <ContentRenderer content={item.body} />
            )}
          </div>
        )}

        {item.link && (
          <p className="mt-6 text-sm text-muted-foreground">
            元の記事:{" "}
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {item.link}
            </a>
          </p>
        )}
      </article>
    </div>
  );
}
