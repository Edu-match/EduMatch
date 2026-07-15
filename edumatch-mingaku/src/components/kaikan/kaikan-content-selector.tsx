"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, CheckCircle2, ArrowRight, Clock, AlertTriangle } from "lucide-react";

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

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtTime(s: string | null): string {
  const d = toDate(s);
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(d);
}

function fmtRange(a: string | null, b: string | null): string {
  const start = fmtTime(a);
  const end = fmtTime(b);
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return "時間未定";
}

function dayKey(s: string | null): string {
  const d = toDate(s);
  if (!d) return "未定";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function fmtDayHeader(s: string | null): string {
  const d = toDate(s);
  if (!d) return "日時未定";
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(d);
}

const VENUE_COLORS: Record<string, string> = {
  "ステージ1": "border-l-blue-500",
  "ステージ2": "border-l-amber-500",
  "会議室": "border-l-emerald-500",
  "大会議室": "border-l-emerald-500",
  "ホール": "border-l-purple-500",
};

function venueColor(location: string): string {
  for (const [key, cls] of Object.entries(VENUE_COLORS)) {
    if (location.includes(key)) return cls;
  }
  return "border-l-slate-300";
}

/** 2つの時間帯が重なるか（両方に開始・終了がある場合のみ）。 */
function overlaps(a: SelectableContent, b: SelectableContent): boolean {
  const as = toDate(a.startsAt), ae = toDate(a.endsAt), bs = toDate(b.startsAt), be = toDate(b.endsAt);
  if (!as || !ae || !bs || !be) return false;
  return as.getTime() < be.getTime() && bs.getTime() < ae.getTime();
}

/**
 * タイムテーブル型のコンテンツ選択。日付ごとに時間軸で並べ、
 * 既に選んだコンテンツと時間が重なるものは選択不可（時間重複）にする。
 */
export function KaikanContentSelector({ contents, appliedIds }: { contents: SelectableContent[]; appliedIds: string[] }) {
  const router = useRouter();
  const appliedSet = useMemo(() => new Set(appliedIds), [appliedIds]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(appliedIds));

  const byId = useMemo(() => new Map(contents.map((c) => [c.id, c])), [contents]);
  const selectedContents = useMemo(
    () => [...selected].map((id) => byId.get(id)).filter(Boolean) as SelectableContent[],
    [selected, byId],
  );

  // 各コンテンツについて、現在の選択と時間重複する相手（自分以外）を返す。
  function conflictWith(c: SelectableContent): SelectableContent | null {
    for (const s of selectedContents) {
      if (s.id !== c.id && overlaps(c, s)) return s;
    }
    return null;
  }

  const toggle = (c: SelectableContent) => {
    if (appliedSet.has(c.id)) return; // 申込済みは外せない
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(c.id)) n.delete(c.id);
      else n.add(c.id);
      return n;
    });
  };

  // 日付ごとにグルーピング（時間順）。
  const groups = useMemo(() => {
    const sorted = [...contents].sort((a, b) => {
      const at = toDate(a.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = toDate(b.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
    const map = new Map<string, SelectableContent[]>();
    for (const c of sorted) {
      const k = dayKey(c.startsAt);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [contents]);

  const newCount = [...selected].filter((id) => !appliedSet.has(id)).length;

  const proceed = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    router.push(`/forum/kaikan/confirm?ids=${encodeURIComponent(ids.join(","))}`);
  };

  return (
    <div className="pb-28">
      <div className="space-y-6">
        {groups.map(([key, items]) => (
          <section key={key}>
            <h2 className="sticky top-0 z-10 -mx-1 mb-2 bg-background/90 px-1 py-1 text-sm font-bold text-foreground backdrop-blur">
              {fmtDayHeader(items[0]?.startsAt ?? null)}
            </h2>
            <ul className="space-y-2.5">
              {items.map((c) => {
                const applied = appliedSet.has(c.id);
                const checked = selected.has(c.id);
                const full = c.capacity != null && c.applied >= c.capacity && !applied;
                const clash = !checked && !applied ? conflictWith(c) : null;
                const disabled = full || applied || !!clash;
                const remain = c.capacity != null ? Math.max(0, c.capacity - c.applied) : null;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex gap-3 rounded-xl border border-l-4 ${venueColor(c.location)} p-3.5 transition ${
                        disabled ? "cursor-default bg-muted/30" : "cursor-pointer bg-background hover:border-primary/50 hover:bg-primary/[0.03]"
                      } ${checked && !applied ? "border-primary ring-1 ring-primary/30" : ""} ${clash ? "opacity-70" : ""}`}
                    >
                      {/* 時間軸（左レール） */}
                      <div className="flex w-14 shrink-0 flex-col items-center justify-center border-r pr-2 text-center">
                        <span className="text-[11px] font-bold leading-tight text-foreground">{fmtTime(c.startsAt) || "未定"}</span>
                        {fmtTime(c.endsAt) && <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{fmtTime(c.endsAt)}</span>}
                      </div>

                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(c)}
                        className="mt-1 h-4 w-4 shrink-0"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold">{c.title}</span>
                          {applied && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> 申込済
                            </span>
                          )}
                          {full && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">満員</span>}
                          {clash && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              <AlertTriangle className="h-3 w-3" /> 時間重複
                            </span>
                          )}
                        </span>
                        {c.description && <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{c.description}</span>}
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtRange(c.startsAt, c.endsAt)}</span>
                          {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                          {remain != null && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />残り{remain}</span>}
                        </span>
                        {clash && <span className="mt-1 block text-[11px] text-amber-700">「{clash.title}」と時間が重なっています</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* 下部固定バー */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="text-sm font-medium">
            <span className="font-bold text-primary">{newCount}</span> 件を新規申込
            {selected.size - newCount > 0 && <span className="text-muted-foreground">（申込済 {selected.size - newCount} 件）</span>}
          </span>
          <button type="button" onClick={proceed} disabled={selected.size === 0} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            確認へ進む <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
