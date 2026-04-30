"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  ImageDown,
  Search,
  Scale,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceWithProvider } from "@/app/_actions/services";
import { ThumbnailOrTitle } from "@/components/ui/thumbnail-or-title";

// ─── チャートカラー ─────────────────────────────────────────────────────────
const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ef4444"] as const;

// ─── レーダーチャートの評価軸（5軸） ─────────────────────────────────────────
const AXES = [
  { key: "attention" as const, label: "注目度" },
  { key: "popularity" as const, label: "人気度" },
  { key: "demand" as const, label: "需要度" },
  { key: "reputation" as const, label: "評判" },
  { key: "content" as const, label: "情報量" },
];
type AxisKey = (typeof AXES)[number]["key"];
type Scores = Record<AxisKey, number>;

function buildScores(services: ServiceWithProvider[]): Map<string, Scores> {
  const raw = {
    attention: services.map((s) => s.view_count ?? 0),
    popularity: services.map((s) => s.favorite_count ?? 0),
    demand: services.map((s) => s.request_count ?? 0),
    reputation: services.map((s) => s.review_count ?? 0),
    content: services.map((s) =>
      Math.min(((s.description?.length ?? 0) + ((s as any).content?.length ?? 0)) / 20, 100)
    ),
  };

  const normalized: Record<AxisKey, number[]> = {} as Record<AxisKey, number[]>;
  for (const [k, vals] of Object.entries(raw) as [AxisKey, number[]][]) {
    const max = Math.max(...vals);
    normalized[k] = vals.map((v) => (max === 0 ? 50 : Math.round((v / max) * 100)));
  }

  const map = new Map<string, Scores>();
  services.forEach((s, i) => {
    map.set(s.id, {
      attention: normalized.attention[i],
      popularity: normalized.popularity[i],
      demand: normalized.demand[i],
      reputation: normalized.reputation[i],
      content: normalized.content[i],
    });
  });
  return map;
}

// ─── SVGレーダーチャート ────────────────────────────────────────────────────
function RadarChart({ scores, color, size = 180 }: { scores: Scores; color: string; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.33;
  const labelR = r + 24;
  const n = AXES.length;
  const levels = 4;

  const angle = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2;
  const pt = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i)),
  });

  const gridPolygons = Array.from({ length: levels }, (_, lvl) => {
    const gr = (r * (lvl + 1)) / levels;
    return AXES.map((_, i) => { const p = pt(i, gr); return `${p.x},${p.y}`; }).join(" ");
  });

  const dataPolygon = AXES.map((ax, i) => {
    const p = pt(i, (scores[ax.key] / 100) * r);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {gridPolygons.map((pts, lvl) => (
        <polygon key={lvl} points={pts} fill="none" stroke="#e5e7eb"
          strokeWidth={lvl === levels - 1 ? 1.5 : 0.8} />
      ))}
      {AXES.map((_, i) => {
        const p = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      <polygon points={dataPolygon} fill={color} fillOpacity={0.22}
        stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {AXES.map((ax, i) => {
        const p = pt(i, (scores[ax.key] / 100) * r);
        return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} stroke="white" strokeWidth={1.5} />;
      })}
      {AXES.map((ax, i) => {
        const p = pt(i, labelR);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight="600" fill="#6b7280">
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── エクスポートヘルパー ────────────────────────────────────────────────────
const EXPORT_ROWS: { label: string; getValue: (s: ServiceWithProvider) => string }[] = [
  { label: "カテゴリ", getValue: (s) => s.category ?? "" },
  { label: "提供者", getValue: (s) => s.provider?.name ?? "" },
  { label: "価格", getValue: (s) => s.price_info ?? "" },
  { label: "タグ", getValue: (s) => (s.tags ?? []).join(", ") },
  { label: "概要", getValue: (s) => s.description ?? "" },
  { label: "閲覧数", getValue: (s) => String(s.view_count ?? 0) },
  { label: "お気に入り数", getValue: (s) => String(s.favorite_count ?? 0) },
  { label: "資料請求数", getValue: (s) => String(s.request_count ?? 0) },
  { label: "口コミ数", getValue: (s) => String(s.review_count ?? 0) },
];

function today() {
  return new Date().toLocaleDateString("ja-JP").replace(/\//g, "-");
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(services: ServiceWithProvider[]) {
  const headers = ["項目", ...services.map((s) => s.title)];
  const rows = EXPORT_ROWS.map((row) => [
    row.label,
    ...services.map((s) => {
      const v = row.getValue(s);
      return v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  triggerBlobDownload(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `サービス比較_${today()}.csv`);
}

async function exportExcel(services: ServiceWithProvider[]) {
  const XLSX = await import("xlsx");
  const headers = ["項目", ...services.map((s) => s.title)];
  const rows = EXPORT_ROWS.map((row) => [row.label, ...services.map((s) => row.getValue(s))]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [{ wch: 18 }, ...services.map(() => ({ wch: 32 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "サービス比較");
  XLSX.writeFile(wb, `サービス比較_${today()}.xlsx`);
}

// ─── サービス選択グリッド ────────────────────────────────────────────────────
function ServiceSelector({
  services,
  selectedIds,
  onToggle,
}: {
  services: ServiceWithProvider[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = ["all", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filtered = services.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      (s.provider?.name ?? "").toLowerCase().includes(q);
    return matchSearch && (category === "all" || s.category === category);
  });

  const isFull = selectedIds.length >= 5;

  return (
    <div className="space-y-3">
      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="サービス名・説明で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors border flex-shrink-0",
              cat === category
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            )}
          >
            {cat === "all" ? "すべて" : cat}
          </button>
        ))}
      </div>

      {/* カードグリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-[420px] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
            該当するサービスが見つかりません
          </div>
        )}
        {filtered.map((s) => {
          const isSelected = selectedIds.includes(s.id);
          const idx = selectedIds.indexOf(s.id);
          const color = isSelected ? COLORS[idx] : undefined;
          const disabled = isFull && !isSelected;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              disabled={disabled}
              className={cn(
                "group relative flex flex-col rounded-xl border-2 p-2.5 text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary h-36 overflow-hidden",
                isSelected ? "shadow-md" : "border-border hover:border-primary/50 hover:shadow-sm bg-background",
                disabled && "opacity-40 cursor-not-allowed pointer-events-none"
              )}
              style={isSelected ? { borderColor: color, background: `${color}0d` } : undefined}
            >
              {/* 選択番号バッジ */}
              <div
                className={cn(
                  "absolute top-2 right-2 z-10 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                  isSelected ? "text-white" : "border-muted-foreground/25 bg-background text-muted-foreground/40"
                )}
                style={isSelected ? { background: color, borderColor: color } : undefined}
              >
                {isSelected ? idx + 1 : "+"}
              </div>

              {/* サムネイル（常に固定高さ） */}
              <div className="relative w-full h-16 rounded-lg overflow-hidden mb-2 bg-muted/30 flex-shrink-0">
                <ThumbnailOrTitle
                  src={s.thumbnail_url ?? undefined}
                  title={s.title}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              {/* タイトル */}
              <p className="text-[11px] font-semibold leading-snug line-clamp-2 pr-5 flex-1">
                {s.title}
              </p>

              {/* カテゴリ */}
              <div className="mt-2 flex-shrink-0">
                <Badge variant="secondary" className="text-[9px] py-0 h-4 leading-tight">
                  {s.category}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {isFull && (
        <p className="text-xs text-center text-muted-foreground">
          5つ選択済みです。カードをクリックすると解除できます。
        </p>
      )}
    </div>
  );
}

// ─── メインコンポーネント ────────────────────────────────────────────────────
type Props = { initialServices: ServiceWithProvider[] };

export default function CompareClientPage({ initialServices }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(true);
  const [exportingPng, setExportingPng] = useState(false);

  // PNG キャプチャ対象
  const captureRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const selected = selectedIds
    .map((id) => initialServices.find((s) => s.id === id))
    .filter(Boolean) as ServiceWithProvider[];

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 5
        ? [...prev, id]
        : prev
    );
  };

  const scores = buildScores(selected);

  async function exportPNG() {
    if (!captureRef.current) return;
    setExportingPng(true);

    const captureEl = captureRef.current;
    const scrollEl = tableScrollRef.current;
    const prevCaptureWidth = captureEl.style.width;

    // Step 1: テーブルのスクロールコンテナを展開
    if (scrollEl) {
      scrollEl.style.overflow = "visible";
      scrollEl.style.width = "max-content";
    }

    // Step 2: レイアウト更新を待つ
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    // Step 3: captureRef 自体も全コンテンツ幅に拡張
    const fullWidth = captureEl.scrollWidth;
    captureEl.style.width = `${fullWidth}px`;

    // Step 4: 再レイアウトを待つ
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureEl, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `サービス比較_${today()}.png`;
      a.click();
    } catch (e) {
      console.error("PNG export failed:", e);
    } finally {
      captureEl.style.width = prevCaptureWidth;
      if (scrollEl) {
        scrollEl.style.overflow = "";
        scrollEl.style.width = "";
      }
      setExportingPng(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ページヘッダー */}
      <div className="border-b bg-background">
        <div className="container max-w-7xl py-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
            <Link href="/services">
              <ArrowLeft className="h-4 w-4 mr-1" />
              サービス一覧
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">サービス比較</h1>
              <p className="text-xs text-muted-foreground">最大5つのサービスを比較できます</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl py-6">
        {/* ─── サービス選択パネル ─── */}
        <div className="mb-6 rounded-xl border bg-background shadow-sm">
          {/* 折りたたみトグル */}
          <button
            type="button"
            onClick={() => setSelectorOpen((p) => !p)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors rounded-xl text-left"
          >
            <span className="text-sm font-semibold">比較するサービスを選択</span>

            {/* 選択済みドット */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="h-2.5 w-2.5 rounded-full border-2 transition-all"
                  style={
                    i < selected.length
                      ? { background: COLORS[i], borderColor: COLORS[i] }
                      : { borderColor: "#d1d5db" }
                  }
                />
              ))}
            </div>

            <span className="text-xs text-muted-foreground font-mono">
              {selected.length}/5
            </span>

            <span className="ml-auto text-muted-foreground">
              {selectorOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>

          {selectorOpen && (
            <div className="px-4 pb-4 border-t pt-4">
              <ServiceSelector
                services={initialServices}
                selectedIds={selectedIds}
                onToggle={toggle}
              />
            </div>
          )}
        </div>

        {/* 未選択状態 */}
        {selected.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <Scale className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-1">
              比較するサービスを選択してください
            </p>
            <p className="text-sm text-muted-foreground/60">
              上のカードから最大5つ選択できます
            </p>
          </div>
        )}

        {selected.length > 0 && (
          <>
            {/* エクスポートボタン */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(selected)}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportExcel(selected)}>
                <FileSpreadsheet className="h-3.5 w-3.5" />Excel
              </Button>
              <Button
                variant="outline" size="sm" className="gap-1.5"
                onClick={exportPNG}
                disabled={exportingPng}
              >
                <ImageDown className="h-3.5 w-3.5" />
                {exportingPng ? "生成中..." : "画像 (PNG)"}
              </Button>
            </div>

            {/* ─── キャプチャ対象ラッパー ─── */}
            <div ref={captureRef} className="space-y-6 bg-muted/20 rounded-xl p-1">

              {/* レーダーチャートセクション */}
              <section>
                <h2 className="text-base font-semibold mb-3 px-1 flex items-center gap-2">
                  <span>📊</span> スコアチャート
                </h2>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${Math.min(selected.length, 5)}, minmax(0, 1fr))` }}
                >
                  {selected.map((s, i) => {
                    const sc = scores.get(s.id)!;
                    return (
                      <div key={s.id} className="flex flex-col items-center rounded-xl border bg-background p-4">
                        <div className="w-full flex items-center gap-2 mb-3">
                          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                          <span className="text-xs font-semibold truncate">{s.title}</span>
                        </div>
                        <RadarChart scores={sc} color={COLORS[i]} size={170} />
                        <div className="mt-3 w-full space-y-1.5">
                          {AXES.map((ax) => {
                            const val = sc[ax.key];
                            return (
                              <div key={ax.key} className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-muted-foreground w-12 flex-shrink-0">{ax.label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${val}%`, background: COLORS[i] }} />
                                </div>
                                <span className="w-7 text-right font-mono text-muted-foreground">{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 比較テーブルセクション */}
              <section>
                <h2 className="text-base font-semibold mb-3 px-1 flex items-center gap-2">
                  <span>📋</span> 詳細比較表
                </h2>
                <div
                  ref={tableScrollRef}
                  className="overflow-x-auto rounded-xl border bg-background shadow-sm"
                >
                  <table className="w-full" style={{ minWidth: `${200 + selected.length * 220}px` }}>
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36 sticky left-0 bg-muted/40 z-10">
                          項目
                        </th>
                        {selected.map((s, i) => (
                          <th key={s.id} className="p-4 text-center align-top min-w-[220px]">
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-1 w-12 rounded-full" style={{ background: COLORS[i] }} />
                              {s.thumbnail_url && (
                                <div className="relative w-24 h-14 rounded overflow-hidden">
                                  <ThumbnailOrTitle
                                    src={s.thumbnail_url}
                                    title={s.title}
                                    fill
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <span className="text-sm font-bold leading-snug">{s.title}</span>
                              <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <GroupRow label="基本情報" cols={selected.length} />
                      <CompareRow label="提供者">
                        {selected.map((s) => (
                          <td key={s.id} className="p-4 text-center text-sm">{s.provider?.name || "—"}</td>
                        ))}
                      </CompareRow>
                      <CompareRow label="価格">
                        {selected.map((s) => (
                          <td key={s.id} className="p-4 text-center text-sm font-semibold text-primary">
                            {s.price_info || "—"}
                          </td>
                        ))}
                      </CompareRow>
                      <CompareRow label="タグ">
                        {selected.map((s) => (
                          <td key={s.id} className="p-4 text-center">
                            {(s.tags ?? []).length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {(s.tags ?? []).slice(0, 5).map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                        ))}
                      </CompareRow>
                      <CompareRow label="概要">
                        {selected.map((s) => (
                          <td key={s.id} className="p-4 align-top">
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">
                              {s.description || "—"}
                            </p>
                          </td>
                        ))}
                      </CompareRow>

                      <GroupRow label="実績・人気度" cols={selected.length} />
                      <CountRow label="閲覧数" icon="👀" services={selected} getValue={(s) => s.view_count ?? 0} />
                      <CountRow label="お気に入り" icon="❤️" services={selected} getValue={(s) => s.favorite_count ?? 0} />
                      <CountRow label="資料請求" icon="📋" services={selected} getValue={(s) => s.request_count ?? 0} />
                      <CountRow label="口コミ数" icon="💬" services={selected} getValue={(s) => s.review_count ?? 0} />

                      <GroupRow label="アクション" cols={selected.length} />
                      <tr className="border-t">
                        <td className="p-4 sticky left-0 bg-background" />
                        {selected.map((s) => (
                          <td key={s.id} className="p-4">
                            <div className="flex flex-col gap-2">
                              <Button asChild size="sm" className="w-full">
                                <Link href={`/services/${s.id}`}>詳細を見る</Link>
                              </Button>
                              <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link href={`/services/${s.id}#contact`}>資料請求</Link>
                              </Button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── サブコンポーネント ──────────────────────────────────────────────────────

function GroupRow({ label, cols }: { label: string; cols: number }) {
  return (
    <tr className="border-t bg-muted/30">
      <td
        colSpan={cols + 1}
        className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/30"
      >
        {label}
      </td>
    </tr>
  );
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t hover:bg-muted/10 transition-colors">
      <td className="p-4 text-sm text-muted-foreground font-medium sticky left-0 bg-background whitespace-nowrap">
        {label}
      </td>
      {children}
    </tr>
  );
}

function CountRow({
  label, icon, services, getValue,
}: {
  label: string;
  icon: string;
  services: ServiceWithProvider[];
  getValue: (s: ServiceWithProvider) => number;
}) {
  const values = services.map(getValue);
  const max = Math.max(...values);
  return (
    <tr className="border-t hover:bg-muted/10 transition-colors">
      <td className="p-4 text-sm text-muted-foreground font-medium sticky left-0 bg-background whitespace-nowrap">
        {label}
      </td>
      {services.map((s) => {
        const val = getValue(s);
        const isMax = val === max && max > 0;
        return (
          <td key={s.id} className="p-4 text-center">
            <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", isMax && "text-primary")}>
              {icon} {val.toLocaleString()}
              {isMax && services.length > 1 && <span className="text-[10px] ml-0.5">★</span>}
            </span>
          </td>
        );
      })}
    </tr>
  );
}
