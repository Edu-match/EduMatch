"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Ticket, MapPin, CalendarDays, Users } from "lucide-react";

type Content = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  capacity: number | null;
  applied: number;
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
 *  イベントのコンテンツ（カテゴリ）一覧を表示し、各コンテンツから申込（電子チケット）へ進む。 */
export function KaikanHubOverlay({ open, label, onClose }: { open: boolean; label: string; onClose: () => void }) {
  const [contents, setContents] = useState<Content[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setContents(null);
    fetch("/api/kaikan/contents")
      .then((r) => r.json())
      .then((d: { contents?: Content[] }) => { if (!cancelled) setContents(d.contents ?? []); })
      .catch(() => { if (!cancelled) setContents([]); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-[#040714]/70 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[82%] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-sky-300/25 bg-gradient-to-b from-[#0c1330]/95 to-[#080c1f]/95 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-sky-300">
              <Ticket className="h-3.5 w-3.5" /> 井戸端会議 · {label}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">コンテンツ／チケット申込</h2>
            <p className="mt-1 text-xs text-white/55">参加したいコンテンツを選ぶと、受付用の電子チケット（QR）が発行されます。</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {contents === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />
              ))}
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
                    <Link
                      href={`/forum/kaikan/${c.id}`}
                      className="group block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-300/40 hover:bg-sky-400/[0.06]"
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
                    </Link>
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
