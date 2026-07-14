"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

export type SelectableContent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  applied: number;
};

const VENUES = [
  { key: "国際会議室", label: "国際会議室", bg: "bg-violet-50", border: "border-violet-300", ring: "ring-violet-500", selectedBg: "bg-violet-100", text: "text-violet-800" },
  { key: "ステージ①", label: "ステージ①円卓", bg: "bg-sky-50", border: "border-sky-300", ring: "ring-sky-500", selectedBg: "bg-sky-100", text: "text-sky-800" },
  { key: "ステージ②", label: "ステージ②", bg: "bg-rose-50", border: "border-rose-300", ring: "ring-rose-500", selectedBg: "bg-rose-100", text: "text-rose-800" },
] as const;

const DAY_START = 9 * 60 + 30;
const DAY_END = 17 * 60 + 30;
const PX_PER_MIN = 2.0;
const TOTAL_HEIGHT = (DAY_END - DAY_START) * PX_PER_MIN;

/* ---------- JST-safe time helpers ---------- */
const jstFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false,
});

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toMinutes(d: Date): number {
  const parts = jstFmt.formatToParts(d);
  const h = Number(parts.find(p => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find(p => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
}

function getVenueIndex(location: string): number {
  if (location.includes("国際会議室")) return 0;
  if (location.includes("ステージ①") || location.includes("ステージ1") || location.includes("円卓")) return 1;
  if (location.includes("ステージ②") || location.includes("ステージ2")) return 2;
  return -1;
}

function overlaps(a: SelectableContent, b: SelectableContent): boolean {
  const as = toDate(a.startsAt), ae = toDate(a.endsAt), bs = toDate(b.startsAt), be = toDate(b.endsAt);
  if (!as || !ae || !bs || !be) return false;
  return as.getTime() < be.getTime() && bs.getTime() < ae.getTime();
}

function timeSlots(): string[] {
  const slots: string[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

function SessionBlock({
  content,
  venue,
  selected,
  applied,
  conflicting,
  full,
  onToggle,
}: {
  content: SelectableContent;
  venue: typeof VENUES[number];
  selected: boolean;
  applied: boolean;
  conflicting: boolean;
  full: boolean;
  onToggle: () => void;
}) {
  const start = toDate(content.startsAt);
  const end = toDate(content.endsAt);
  if (!start || !end) return null;

  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const top = (startMin - DAY_START) * PX_PER_MIN;
  const height = Math.max((endMin - startMin) * PX_PER_MIN, 28);
  const disabled = applied || full || conflicting;
  const showDesc = height > 80;

  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      className={[
        "absolute left-1 right-1 rounded-lg border p-1.5 text-left text-xs leading-tight transition-all duration-150 overflow-hidden shadow-sm",
        selected && !applied ? `${venue.selectedBg} ${venue.border} ring-2 ${venue.ring}` : `${venue.bg} ${venue.border}`,
        applied ? "opacity-60" : "",
        conflicting ? "opacity-40 cursor-not-allowed" : "",
        full && !applied ? "opacity-40 cursor-not-allowed" : "",
        !disabled && !selected ? "hover:ring-1 hover:ring-primary/40 hover:shadow-md hover:scale-[1.01] cursor-pointer" : "",
        !disabled && selected ? "hover:shadow-md hover:scale-[1.01]" : "",
      ].join(" ")}
      style={{ top, height }}
      title={`${fmtTime(start)}–${fmtTime(end)} ${content.title}${conflicting ? " (時間重複)" : ""}${full ? " (満員)" : ""}`}
    >
      {/* Conflict striped overlay */}
      {conflicting && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20 rounded-lg"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)",
          }}
        />
      )}
      <div className={`font-bold ${venue.text} ${height > 50 ? "line-clamp-3" : "line-clamp-1"}`}>
        {conflicting && <AlertTriangle className="inline-block h-3 w-3 mr-0.5 -mt-0.5 text-amber-500" />}
        {content.title}
      </div>
      {height > 40 && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {fmtTime(start)}&ndash;{fmtTime(end)}
        </div>
      )}
      {showDesc && content.description && (
        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
          {content.description}
        </div>
      )}
      {applied && <CheckCircle2 className="absolute top-1 right-1 h-3.5 w-3.5 text-emerald-600" />}
    </button>
  );
}

/* ---------- Scroll hint hook ---------- */
function useScrollHint(ref: React.RefObject<HTMLDivElement | null>) {
  const [showHint, setShowHint] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    // hide hint after first scroll
    const hideHint = () => { setShowHint(false); el.removeEventListener("scroll", hideHint); };
    el.addEventListener("scroll", hideHint, { passive: true });

    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("scroll", hideHint);
      window.removeEventListener("resize", update);
    };
  }, [ref, update]);

  return { showHint, canScrollLeft, canScrollRight };
}

export function KaikanTimetable({ contents, appliedIds }: { contents: SelectableContent[]; appliedIds: string[] }) {
  const router = useRouter();
  const appliedSet = useMemo(() => new Set(appliedIds), [appliedIds]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(appliedIds));
  const slots = useMemo(timeSlots, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showHint, canScrollLeft, canScrollRight } = useScrollHint(scrollRef);

  const byId = useMemo(() => new Map(contents.map((c) => [c.id, c])), [contents]);
  const selectedContents = useMemo(
    () => [...selected].map((id) => byId.get(id)).filter(Boolean) as SelectableContent[],
    [selected, byId],
  );

  const venueContents = useMemo(() => {
    const result: SelectableContent[][] = [[], [], []];
    for (const c of contents) {
      const idx = getVenueIndex(c.location);
      if (idx >= 0) result[idx].push(c);
    }
    return result;
  }, [contents]);

  function conflictWith(c: SelectableContent): boolean {
    for (const s of selectedContents) {
      if (s.id !== c.id && overlaps(c, s)) return true;
    }
    return false;
  }

  const toggle = (c: SelectableContent) => {
    if (appliedSet.has(c.id)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(c.id)) n.delete(c.id);
      else n.add(c.id);
      return n;
    });
  };

  const newCount = [...selected].filter((id) => !appliedSet.has(id)).length;

  const proceed = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    router.push(`/forum/kaikan/confirm?ids=${encodeURIComponent(ids.join(","))}`);
  };

  return (
    <div className="pb-28">
      {/* Scroll container with gradient fades */}
      <div className="relative">
        {/* Left fade */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-background to-transparent" />
        )}
        {/* Right fade */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-background to-transparent" />
        )}

        {/* Mobile scroll hint */}
        {showHint && (
          <div className="sm:hidden absolute inset-x-0 top-14 z-30 flex justify-center pointer-events-none animate-pulse">
            <span className="bg-muted/80 backdrop-blur text-muted-foreground text-[11px] px-3 py-1 rounded-full">
              &larr; スクロール &rarr;
            </span>
          </div>
        )}

        <div ref={scrollRef} className="overflow-x-auto scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="sticky top-0 z-20 grid grid-cols-[56px_1fr_1fr_1fr] border-b bg-background/95 backdrop-blur">
              <div className="border-r p-2 text-[10px] text-muted-foreground">時間</div>
              {VENUES.map((v) => (
                <div key={v.key} className={`border-l p-2 text-center text-xs font-bold ${v.text}`}>
                  {v.label}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative grid grid-cols-[56px_1fr_1fr_1fr]" style={{ height: TOTAL_HEIGHT }}>
              {/* Time labels column */}
              <div className="relative border-r">
                {slots.map((slot) => {
                  const [h, m] = slot.split(":").map(Number);
                  const top = (h * 60 + m - DAY_START) * PX_PER_MIN;
                  const isHour = m === 0;
                  return (
                    <div key={slot} className="absolute right-0 left-0" style={{ top }}>
                      <span className={`absolute -top-2 right-1 flex items-center gap-0.5 tabular-nums ${isHour ? "text-xs font-bold text-foreground" : "text-[10px] text-muted-foreground"}`}>
                        {isHour && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
                        {slot}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 3 venue columns */}
              {VENUES.map((venue, colIdx) => (
                <div key={venue.key} className="relative border-l">
                  {/* Grid lines */}
                  {slots.map((slot) => {
                    const [h, m] = slot.split(":").map(Number);
                    const top = (h * 60 + m - DAY_START) * PX_PER_MIN;
                    const isHour = m === 0;
                    return (
                      <div
                        key={slot}
                        className={`absolute left-0 right-0 ${isHour ? "border-t border-border/80" : "border-t border-border/20 border-dashed"}`}
                        style={{ top }}
                      />
                    );
                  })}

                  {/* Session blocks */}
                  {venueContents[colIdx].map((c) => {
                    const isApplied = appliedSet.has(c.id);
                    const isSelected = selected.has(c.id);
                    const isFull = c.capacity != null && c.applied >= c.capacity && !isApplied;
                    const isConflicting = !isSelected && !isApplied && conflictWith(c);
                    return (
                      <SessionBlock
                        key={c.id}
                        content={c}
                        venue={venue}
                        selected={isSelected}
                        applied={isApplied}
                        conflicting={isConflicting}
                        full={isFull}
                        onToggle={() => toggle(c)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fixed bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur shadow-lg supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="text-sm font-medium">
            <span className="font-bold text-primary">{newCount}</span> 件を新規申込
            {selected.size - newCount > 0 && <span className="text-muted-foreground">（申込済 {selected.size - newCount} 件）</span>}
          </span>
          <button
            type="button"
            onClick={proceed}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/90 px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-lg disabled:opacity-50"
          >
            確認へ進む <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
