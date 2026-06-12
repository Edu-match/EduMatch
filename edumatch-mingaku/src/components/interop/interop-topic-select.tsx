"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, MessageCircle, MessagesSquare } from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { InteropChatWidget } from "@/components/interop/interop-chat-widget";
import type { InteropThemeMode } from "@/lib/interop-settings";

export type SelectableTopic = {
  id: string;
  name: string;
  description: string;
  postCount: number;
};

/** トピックが設定されたサブカテゴリの入口：トピックを選んでから投稿ページへ。 */
export function InteropTopicSelect({
  sub,
  topics,
  accent,
  themeMode = "auto",
}: {
  sub: { id: string; name: string; description: string; categoryName: string; categorySlug?: string };
  topics: SelectableTopic[];
  accent: string;
  themeMode?: InteropThemeMode;
}) {
  return (
    <main className="relative min-h-[100dvh] w-full bg-[#070a1c] text-white">
      <InteropBackdrop themeMode={themeMode} />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-16 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/interop"
            prefetch={false}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
            style={{ background: `${accent}22`, borderColor: `${accent}66` }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> マップに戻る
          </Link>
        </div>

        <header
          className="mt-4 rounded-3xl border px-5 py-6"
          style={{
            background: "rgba(8,11,32,0.72)",
            borderColor: `${accent}44`,
            boxShadow: `0 0 30px ${accent}1f`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: accent }}>
            <MessageCircle className="h-3.5 w-3.5" /> {sub.categoryName}
          </div>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{sub.name}</h1>
          {sub.description && (
            <p className="mt-2 text-sm leading-relaxed text-white/70">{sub.description}</p>
          )}
          <p className="mt-3 text-xs font-bold text-white/50">トピックを選んで投稿・閲覧できます</p>
        </header>

        <ul className="mt-4 space-y-2.5">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/interop/t/${sub.id}/topic/${t.id}`}
                prefetch={false}
                className="group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition hover:brightness-110"
                style={{
                  background: "rgba(255,255,255,0.045)",
                  borderColor: `${accent}3a`,
                  boxShadow: `0 2px 14px rgba(0,0,0,0.25)`,
                }}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                  style={{ background: `${accent}26`, border: `1px solid ${accent}55` }}
                >
                  <MessagesSquare className="h-5 w-5" style={{ color: accent }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white/95">{t.name}</span>
                  {t.description && (
                    <span className="mt-0.5 block truncate text-xs text-white/55">{t.description}</span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-white/45">{t.postCount}件</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/80" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <InteropChatWidget context={`${sub.categoryName}｜${sub.name}（トピック一覧）`} />
    </main>
  );
}
