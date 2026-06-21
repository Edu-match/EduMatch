"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Users, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export type SelectableContent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string | null;
  capacity: number | null;
  applied: number;
};

const PER_PAGE = 10;

function fmtDate(d: string | null): string {
  if (!d) return "";
  try { return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d)); } catch { return ""; }
}

/** コンテンツ選択（10件/ページ・下部固定ボタン）。選択後に確認ページへ。 */
export function KaikanContentSelector({ contents, appliedIds }: { contents: SelectableContent[]; appliedIds: string[] }) {
  const router = useRouter();
  const appliedSet = useMemo(() => new Set(appliedIds), [appliedIds]);
  // 申込済みは常に含む（チェック済み・外せない）。新規は自由選択。
  const [selected, setSelected] = useState<Set<string>>(() => new Set(appliedIds));
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(contents.length / PER_PAGE));
  const pageItems = contents.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const newCount = [...selected].filter((id) => !appliedSet.has(id)).length;

  const toggle = (id: string) => {
    if (appliedSet.has(id)) return;
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const proceed = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    router.push(`/forum/kaikan/confirm?ids=${encodeURIComponent(ids.join(","))}`);
  };

  return (
    <div className="pb-24">
      <ul className="space-y-2.5">
        {pageItems.map((c) => {
          const full = c.capacity != null && c.applied >= c.capacity;
          const applied = appliedSet.has(c.id);
          const checked = selected.has(c.id);
          const disabled = full || applied;
          return (
            <li key={c.id}>
              <label className={`flex items-start gap-3 rounded-xl border p-4 transition ${disabled ? "cursor-default bg-muted/30 opacity-80" : "cursor-pointer bg-background hover:border-primary/50 hover:bg-primary/[0.03]"} ${checked && !applied ? "border-primary ring-1 ring-primary/30" : ""}`}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(c.id)} className="mt-1 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{c.title}</span>
                    {applied && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />申込済</span>}
                    {full && !applied && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">満席</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {c.startsAt && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(c.startsAt)}</span>}
                    {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                    {c.capacity != null && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{c.applied}/{c.capacity}</span>}
                  </span>
                  {c.description && <span className="mt-1.5 block line-clamp-2 text-sm text-foreground/80">{c.description}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* ページネーション */}
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" />前へ</button>
          <span className="text-sm text-muted-foreground">{page + 1} / {pageCount}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40">次へ<ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {/* 下部固定バー */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="text-sm font-medium">
            <span className="font-bold text-primary">{selected.size}</span> 件選択中{newCount > 0 ? `（新規${newCount}件）` : ""}
          </span>
          <button type="button" onClick={proceed} disabled={selected.size === 0} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            確認へ進む <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
