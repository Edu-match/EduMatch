"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Ticket, MapPin, CalendarDays, Users, ChevronRight, ChevronLeft, Info, Trophy, MessagesSquare, ExternalLink, LayoutGrid } from "lucide-react";
import { interopBoardPath } from "@/lib/interop-paths";
import { ensureExternalUrl, type CenterHubItem } from "@/lib/interop-settings";

type Content = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  capacity: number | null;
  applied: number;
};

type HubCategory = {
  key: string;
  name: string;
  desc?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onActivate: () => void;
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
  } catch {
    return "";
  }
}

/** 中心ハブ（議員会館）クリックで開く“内封”オーバーレイ。
 *  2Dマップと同じく「カテゴリ選択」から入り、カテゴリ「コンテンツ」を選ぶと
 *  個々のコンテンツ一覧 → 申込ページ（/forum/kaikan/[id]）へ進む。 */
export function KaikanHubOverlay({ open, label, onClose }: { open: boolean; label: string; onClose: () => void }) {
  const router = useRouter();
  const [level, setLevel] = useState<"categories" | "contents">("categories");
  const [hubItems, setHubItems] = useState<CenterHubItem[] | null>(null);
  const [contents, setContents] = useState<Content[] | null>(null);

  // 開いたら毎回カテゴリ選択から
  useEffect(() => {
    if (open) setLevel("categories");
  }, [open]);

  // ハブ項目（管理画面設定）。2Dの中心ハブと同じソース。
  useEffect(() => {
    if (!open || hubItems !== null) return;
    let cancelled = false;
    fetch("/api/interop/settings")
      .then((r) => r.json())
      .then((d: { settings?: { centerHubItems?: CenterHubItem[] } }) => {
        if (!cancelled) setHubItems(d.settings?.centerHubItems ?? []);
      })
      .catch(() => { if (!cancelled) setHubItems([]); });
    return () => { cancelled = true; };
  }, [open, hubItems]);

  // コンテンツ一覧は「コンテンツ」カテゴリに入ったら取得
  useEffect(() => {
    if (!open || level !== "contents" || contents !== null) return;
    let cancelled = false;
    fetch("/api/kaikan/contents")
      .then((r) => r.json())
      .then((d: { contents?: Content[] }) => { if (!cancelled) setContents(d.contents ?? []); })
      .catch(() => { if (!cancelled) setContents([]); });
    return () => { cancelled = true; };
  }, [open, level, contents]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (level === "contents") setLevel("categories");
      else onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, level, onClose]);

  if (!open) return null;

  // カテゴリ一覧：先頭に「コンテンツ」、続いて2Dと同じハブ項目（設定 or 既定）。
  const categories: HubCategory[] = [
    {
      key: "contents",
      name: "コンテンツ",
      desc: "セッションを選んで申込（電子チケット）",
      icon: LayoutGrid,
      color: "#7dd4fc",
      onActivate: () => setLevel("contents"),
    },
  ];
  if (hubItems && hubItems.length > 0) {
    const palette = ["#fcd34d", "#86efac", "#c4b5fd", "#fca5a5", "#93c5fd"];
    hubItems.filter((it) => it.name?.trim()).forEach((it, i) => {
      categories.push({
        key: it.id,
        name: it.name,
        icon: it.kind === "board" ? MessagesSquare : ExternalLink,
        color: palette[i % palette.length],
        onActivate: () => {
          if (it.kind === "board" && it.subId) { onClose(); router.push(interopBoardPath(it.subId)); }
          else if (it.url) window.open(ensureExternalUrl(it.url), "_blank", "noopener,noreferrer");
        },
      });
    });
  } else {
    categories.push(
      { key: "info", name: "インフォメーション", icon: Info, color: "#fcd34d", onActivate: () => window.open("https://prtimes.jp/main/html/rd/p/000000046.000161501.html", "_blank", "noopener,noreferrer") },
      { key: "champ", name: "AIチャンピオンシップ", icon: Trophy, color: "#c4b5fd", onActivate: () => window.open("https://ai-ueo.org/2026/04/01/u18-ai-championship-2026/", "_blank", "noopener,noreferrer") },
      { key: "opinion", name: "ご意見・要望", icon: MessagesSquare, color: "#86efac", onActivate: () => { onClose(); router.push("/forum"); } },
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-[#040714]/72 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[82%] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-sky-300/25 bg-gradient-to-b from-[#0c1330]/95 to-[#080c1f]/95 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            {level === "contents" ? (
              <button type="button" onClick={() => setLevel("categories")} className="flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:text-sky-200">
                <ChevronLeft className="h-3.5 w-3.5" /> カテゴリへ戻る
              </button>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-sky-300">
                <Ticket className="h-3.5 w-3.5" /> {label}
              </p>
            )}
            <h2 className="mt-1 text-lg font-bold text-white">{level === "contents" ? "コンテンツ／チケット申込" : "カテゴリを選ぶ"}</h2>
            <p className="mt-1 text-xs text-white/55">
              {level === "contents"
                ? "参加したいコンテンツを選ぶと、受付用の電子チケット（QR）が発行されます。"
                : "議員会館イベントのメニュー。「コンテンツ」から申込に進めます。"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {level === "categories" ? (
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {categories.map((c) => {
                const Icon = c.icon;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={c.onActivate}
                      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition hover:border-sky-300/40 hover:bg-sky-400/[0.06]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `${c.color}22`, color: c.color }}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-white">{c.name}</span>
                        {c.desc && <span className="block truncate text-[11px] text-white/50">{c.desc}</span>}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:text-sky-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : contents === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (<div key={i} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />))}
            </div>
          ) : contents.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              現在申込受付中のコンテンツはありません。
            </div>
          ) : (
            <ul className="space-y-3">
              {contents.map((c) => {
                const full = c.capacity != null && c.applied >= c.capacity;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => { onClose(); router.push(`/forum/kaikan/${c.id}`); }}
                      className="group block w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-sky-300/40 hover:bg-sky-400/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white">{c.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/55">
                            {c.startsAt && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(c.startsAt)}</span>}
                            {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                            {c.capacity != null && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{c.applied}/{c.capacity}</span>}
                          </div>
                          {c.description && <p className="mt-2 line-clamp-2 text-sm text-white/70">{c.description}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${full ? "bg-white/10 text-white/50" : "bg-sky-400/20 text-sky-200 group-hover:bg-sky-400/30"}`}>
                          {full ? "満員" : "申込へ →"}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
