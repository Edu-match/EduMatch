"use client";

import Link from "next/link";
import { ArrowUpRight, Briefcase, Calendar, FileText, Video } from "lucide-react";
import type { CategoryContentItem } from "@/lib/forum-category-content";

const KIND_META: Record<
  string,
  { label: string; icon: typeof FileText; accent: string }
> = {
  article: { label: "関連する記事", icon: FileText, accent: "text-sky-600" },
  service: { label: "関連するサービス", icon: Briefcase, accent: "text-emerald-600" },
  media: { label: "関連するメディア", icon: Video, accent: "text-rose-600" },
  "events-info": { label: "関連するイベント情報", icon: Calendar, accent: "text-amber-600" },
};

export function ForumCategoryContentPanel({
  items,
  contentKind,
}: {
  items: CategoryContentItem[];
  contentKind: string;
}) {
  // community などコンテンツ表示しない種別は描画しない
  const meta = KIND_META[contentKind];
  if (!meta || items.length === 0) return null;

  const Icon = meta.icon;
  const isExternal = (href: string) => /^https?:\/\//.test(href);

  return (
    <div className="border-b bg-muted/20">
      <div className="container py-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex items-center gap-2">
            <Icon className={`h-4 w-4 ${meta.accent}`} />
            <h2 className="text-sm font-bold">{meta.label}</h2>
            <span className="text-[11px] text-muted-foreground">
              このテーマに紐づくコンテンツ
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const external = isExternal(item.href);
              const CardInner = (
                <div className="group flex h-full gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-16 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary">
                        {item.title}
                      </h3>
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary/60" />
                    </div>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    {item.meta ? (
                      <p className="mt-1 truncate text-[10px] text-muted-foreground/70">
                        {item.meta}
                      </p>
                    ) : null}
                  </div>
                </div>
              );

              return external ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {CardInner}
                </a>
              ) : (
                <Link key={item.id} href={item.href} className="block">
                  {CardInner}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
