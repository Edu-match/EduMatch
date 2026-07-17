"use client";

import { useState } from "react";
import { CalendarDays, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, Users } from "lucide-react";
import { KaikanTimetable, type SelectableContent } from "./kaikan-timetable";
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set(appliedIds));
  const router = useRouter();

  const totalPages = Math.ceil(contents.length / ITEMS_PER_PAGE);
  const pageItems = contents.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const ids = [...selected].filter((id) => !appliedIds.includes(id));
    if (ids.length === 0) return;
    // confirm ページは ?ids=カンマ区切り を読む（タイムテーブル側と同一形式に統一）
    router.push(`/forum/kaikan/confirm?ids=${encodeURIComponent(ids.join(","))}`);
  };

  const newSelections = [...selected].filter((id) => !appliedIds.includes(id));

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setView("timetable")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            view === "timetable"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          タイムテーブル
        </button>
        <button
          type="button"
          onClick={() => setView("block")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            view === "block"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          ブロック
        </button>
      </div>

      {view === "timetable" ? (
        <KaikanTimetable contents={contents} appliedIds={appliedIds} />
      ) : (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((c) => {
              const isApplied = appliedIds.includes(c.id);
              const isSelected = selected.has(c.id);
              const isFull = c.capacity !== null && c.applied >= c.capacity;
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
                  disabled={isApplied || isFull}
                  onClick={() => toggle(c.id)}
                  className={`group relative rounded-xl border p-4 text-left transition-all ${
                    isApplied
                      ? "border-green-300 bg-green-50 opacity-70"
                      : isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                        : isFull
                          ? "border-border bg-muted/30 opacity-50"
                          : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  {isApplied && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> 申込済
                    </span>
                  )}
                  {isFull && !isApplied && (
                    <span className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      満席
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
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-30"
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
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Confirm bar */}
          {newSelections.length > 0 && (
            <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
              <span className="text-sm font-medium">{newSelections.length}件 選択中</span>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                確認へ進む →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
