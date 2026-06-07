"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { ForumCategoryExplorer } from "@/components/community/forum-category-explorer";

/** トップページ用：井戸端会議マップ */
export function HomeForumSection() {
  return (
    <section className="overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold tracking-tight">井戸端会議</h2>
        </div>
        <Link
          href="/forum"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          すべて見る
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="p-3 sm:p-4">
        <ForumCategoryExplorer embedded />
      </div>
    </section>
  );
}
