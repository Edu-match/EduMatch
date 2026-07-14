"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

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

const PER_PAGE = 10;

/** 時刻のみ（例: 10:00） */
function fmtDate(d: string | null): string {
  if (!d) return "";
  try { return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date(d)); } catch { return ""; }
}

/** 開始–終了の時刻レンジ（例: 10:00 – 11:30） */
function fmtTimeRange(startsAt: string | null, endsAt: string | null): string {
  const start = fmtDate(startsAt);
  if (!start) return "";
  const end = fmtDate(endsAt);
  return end ? `${start} – ${end}` : start;
}

/** 日付見出し（例: 7月28日（月）） */
function fmtDateHeading(d: string): string {
  try { return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(new Date(d)); } catch { return ""; }
}

/** 日付キー（ローカル日付単位でグルーピング） */
function dateKey(d: string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** コンテンツ選択（タイムテーブル表示・10件/ページ・下部固定ボタン）。選択後に確認ページへ。 */
export function KaikanContentSelector({ contents, appliedIds }: { contents: SelectableContent[]; appliedIds: string[] }) {
  const router = useRouter();
  const appliedSet = useMemo(() => new Set(appliedIds), [appliedIds]);
  // 申込済みは常に含む（チェック済み・外せない）。新規は自由選択。
  const [selected, setSelected] = useState<Set<string>>(() => new Set(appliedIds));
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(contents.length / PER_PAGE));
  const pageItems = contents.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const newCount = [...selected].filter((id) => !appliedSet.has(id)).length;

  // 日付ごとにグルーピング（時間未定は最後）。各グループ内は開始時刻順。
  const groups = useMemo(() => {
    const map = new Map<string, SelectableContent[]>();
    const undated: SelectableContent[] = [];
    for (const c of pageItems) {
      if (!c.startsAt) { undated.push(c); continue; }
      const key = dateKey(c.startsAt);
      const arr = map.get(key);
      if (arr) arr.push(c); else map.set(key, [c]);
    }
    const dated = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        heading: fmtDateHeading(items[0].startsAt as string),
        items: [...items].sort((a, b) => new Date(a.startsAt as string).getTime() - new Date(b.startsAt as string).getTime()),
      }));
    if (undated.length > 0) dated.push({ key: "tbd", heading: "時間未定", items: undated });
    return dated;
  }, [pageItems]);

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
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2 border-b pb-1.5 text-sm font-bold text-foreground">{group.heading}</h2>
            <ul className="space-y-2.5">
              {group.items.map((c) => {
                const full = c.capacity != null && c.applied >= c.capacity;
                const applied = appliedSet.has(c.id);
                const checked = selected.has(c.id);
                const disabled = full || applied;
                const timeRange = fmtTimeRange(c.startsAt, c.endsAt);
                return (
                  <li key={c.id}>
                    <label className={`flex items-stretch gap-0 overflow-hidden rounded-xl border transition ${disabled ? "cursor-default bg-muted/30 opacity-80" : "cursor-pointer bg-background hover:border-primary/50 hover:bg-primary/[0.03]"} ${checked && !applied ? "border-primary ring-1 ring-primary/30" : ""}`}>
                      {/* 左：時刻カラム */}
                      {timeRange && (
                        <span className="flex w-20 shrink-0 flex-col items-center justify-center border-r bg-muted/40 px-2 py-4 text-center">
                          <span className="text-sm font-bold tabular-nums leading-tight">{fmtDate(c.startsAt)}</span>
                          {c.endsAt && (
                            <>
                              <span className="text-[10px] leading-tight text-muted-foreground">–</span>
                              <span className="text-sm font-bold tabular-nums leading-tight">{fmtDate(c.endsAt)}</span>
                            </>
                          )}
                        </span>
                      )}
                      {/* 右：コンテンツ */}
                      <span className="flex min-w-0 flex-1 items-start gap-3 p-4">
                        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(c.id)} className="mt-1 h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{c.title}</span>
                            {applied && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />申込済</span>}
                            {full && !applied && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">満席</span>}
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                            {c.capacity != null && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{c.applied}/{c.capacity}</span>}
                          </span>
                          {c.description && <span className="mt-1.5 block line-clamp-2 text-sm text-foreground/80">{c.description}</span>}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

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
