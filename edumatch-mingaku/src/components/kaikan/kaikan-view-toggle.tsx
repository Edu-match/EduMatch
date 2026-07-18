"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, Users, ArrowRight } from "lucide-react";
import { KaikanTimetable, overlapsContents, type SelectableContent } from "./kaikan-timetable";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 15; // 3 cols x 5 rows

type Props = {
  contents: SelectableContent[];
  appliedIds: string[];
};

type ViewMode = "timetable" | "block";

export function KaikanViewToggle({ contents, appliedIds }: Props) {
  const [view, setView] = useState<ViewMode>("timetable");
  const [page, setPage] = useState(0);
  // 選択状態はビュー間で共有（タイムテーブル⇄ブロック切替で消えないよう一元管理）。
  const [selected, setSelected] = useState<Set<string>>(() => new Set(appliedIds));
  const router = useRouter();

  const totalPages = Math.ceil(contents.length / ITEMS_PER_PAGE);
  const pageItems = contents.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const byId = useMemo(() => new Map(contents.map((c) => [c.id, c])), [contents]);
  const selectedContents = useMemo(
    () => [...selected].map((id) => byId.get(id)).filter(Boolean) as SelectableContent[],
    [selected, byId],
  );

  // 選択済みセッションとの時間重複判定（両ビュー共通ルール）。
  const conflictWith = useCallback(
    (c: SelectableContent): boolean => {
      for (const s of selectedContents) {
        if (s.id !== c.id && overlapsContents(c, s)) return true;
      }
      return false;
    },
    [selectedContents],
  );

  const toggle = useCallback(
    (c: SelectableContent) => {
      if (appliedIds.includes(c.id)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(c.id)) next.delete(c.id);
        else next.add(c.id);
        return next;
      });
    },
    [appliedIds],
  );

  const handleConfirm = () => {
    const ids = [...selected].filter((id) => !appliedIds.includes(id));
    if (ids.length === 0) return;
    // confirm ページは ?ids=カンマ区切り を読む（タイムテーブル側と同一形式に統一）
    router.push(`/forum/kaikan/confirm?ids=${encodeURIComponent(ids.join(","))}`);
  };

  const newSelections = [...selected].filter((id) => !appliedIds.includes(id));

  const segmentClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium pointer-coarse:min-h-11 outline-none transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring ${
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setView("timetable")}
          aria-pressed={view === "timetable"}
          className={segmentClass(view === "timetable")}
        >
          <CalendarDays className="h-4 w-4" />
          タイムテーブル
        </button>
        <button
          type="button"
          onClick={() => setView("block")}
          aria-pressed={view === "block"}
          className={segmentClass(view === "block")}
        >
          <LayoutGrid className="h-4 w-4" />
          ブロック
        </button>
      </div>

      {view === "timetable" ? (
        <KaikanTimetable
          contents={contents}
          appliedIds={appliedIds}
          selected={selected}
          onToggle={toggle}
          conflictWith={conflictWith}
        />
      ) : (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((c) => {
              const isApplied = appliedIds.includes(c.id);
              const isSelected = selected.has(c.id);
              const isFull = c.capacity !== null && c.applied >= c.capacity;
              // タイムテーブルと同じ重複ルールをブロックビューにも適用（未選択かつ重複時は選択不可）。
              const isConflicting = !isSelected && !isApplied && !isFull && conflictWith(c);
              const startTime = c.startsAt
                ? new Date(c.startsAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false })
                : null;
              const endTime = c.endsAt
                ? new Date(c.endsAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false })
                : null;

              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isApplied || isFull || isConflicting}
                  onClick={() => toggle(c)}
                  className={`group relative rounded-xl border p-4 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring ${
                    isApplied
                      ? "border-emerald-300 bg-emerald-50 opacity-70"
                      : isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md focus-visible:ring-4 focus-visible:ring-primary/40"
                        : isFull
                          ? "border-border bg-muted/30 opacity-50"
                          : isConflicting
                            ? "border-border bg-muted/30 opacity-50"
                            : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  {isApplied && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> 申込済
                    </span>
                  )}
                  {isFull && !isApplied && (
                    <span className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      満席
                    </span>
                  )}
                  {isConflicting && !isApplied && !isFull && (
                    <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      時間が重複しています
                    </span>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {c.location}
                    {startTime && endTime && ` · ${startTime}〜${endTime}`}
                  </p>
                  <h3 className="mt-1 text-sm font-bold leading-snug line-clamp-2">{c.title}</h3>
                  {c.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {c.applied}{c.capacity ? ` / ${c.capacity}` : ""}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                aria-label="前のページ"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 py-1.5 text-sm outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label="次のページ"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 py-1.5 text-sm outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Confirm bar */}
          {newSelections.length > 0 && (
            <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
              <span className="text-sm font-medium">{newSelections.length}件選択中</span>
              <Button type="button" size="lg" onClick={handleConfirm}>
                確認へ進む <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
