"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, X, Landmark, GraduationCap, Network, Sparkles, Cpu } from "lucide-react";
import { BubbleGraphCanvas } from "@/components/community/forum-bubble-graph/BubbleGraphCanvas";
import { computeBubbleDiameter } from "@/components/community/forum-bubble-graph/layout";
import type { BubbleGraphNode } from "@/components/community/forum-bubble-graph/types";

/**
 * Interop 総合案内所マップ。
 * 井戸端会議のバブルマップUI（BubbleGraphCanvas）を流用し、エデュマッチ本体のDB/フォーラムには
 * 一切依存しない独立構成。項目の追加・編集はこの BOOTHS 配列だけで完結する。
 */
type Booth = {
  id: string;
  label: string;
  sublabel: string;
  /** 詳細パネルに出す説明 */
  description: string;
  color: string;
  icon: React.ReactNode;
  /** 「開く」リンク先。未設定なら案内のみ（後から設定可） */
  href?: string;
  /** 外部リンクなら true */
  external?: boolean;
};

// ▼ 項目はここを編集するだけで増減・差し替えできます（href は適宜設定してください）
const BOOTHS: Booth[] = [
  {
    id: "giin",
    label: "議員会館",
    sublabel: "政策・国会の現場",
    description: "議員会館での取り組み・連携の紹介。",
    color: "#FBC9D4",
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    id: "ai-kentei",
    label: "AI検定",
    sublabel: "AI活用スキルの検定",
    description: "AI活用のスキルを可視化する検定。受検・概要はこちら。",
    color: "#C7EFC0",
    icon: <GraduationCap className="h-5 w-5" />,
    href: "/ai-kentei",
  },
  {
    id: "interop",
    label: "インタロップ",
    sublabel: "Interop Tokyo 2026",
    description: "本イベント（Interop Tokyo 2026）のブース・展示について。",
    color: "#C9D4F6",
    icon: <Network className="h-5 w-5" />,
  },
  {
    id: "edumatch",
    label: "エデュマッチ",
    sublabel: "教育×AIのプラットフォーム",
    description: "教育×AIのサービス・事例・コミュニティをまとめて。",
    color: "#F6EBB0",
    icon: <Sparkles className="h-5 w-5" />,
    href: "/",
  },
  {
    id: "ai-bu",
    label: "AI部",
    sublabel: "AI部の活動",
    description: "AI部の活動・プロダクト・登壇の紹介。",
    color: "#E7CCF4",
    icon: <Cpu className="h-5 w-5" />,
  },
];

export function InteropHubMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const diameter = useMemo(() => computeBubbleDiameter(BOOTHS.length).default, []);
  const nodes: BubbleGraphNode[] = useMemo(
    () =>
      BOOTHS.map((b) => ({
        id: b.id,
        label: b.label,
        sublabel: b.sublabel,
        diameter,
        backgroundColor: b.color,
        icon: b.icon,
        // href を渡すと即遷移してしまうため、案内所では必ず詳細パネルを開く
        onActivate: () => setSelectedId(b.id),
      })),
    [diameter]
  );

  const selected = BOOTHS.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      {/* マップ（井戸端のバブルUIを流用） */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border border-white/15 shadow-2xl shadow-blue-950/40 sm:aspect-[16/10]"
        style={{
          minHeight: 440,
          background: "linear-gradient(135deg, #33529e 0%, #4a78d8 52%, #7aa3f0 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 44%, rgba(225,238,255,0.28) 0%, rgba(120,160,240,0.10) 40%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, #000 35%, transparent 80%)",
          }}
        />
        <BubbleGraphCanvas nodes={nodes} connections={[]} layoutMode="category" className="h-full" />
      </div>

      {/* 詳細パネル */}
      {selected && (
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[#13287a]"
                style={{ background: selected.color }}
                aria-hidden
              >
                {selected.icon}
              </span>
              <div>
                <h3 className="text-lg font-bold leading-tight">{selected.label}</h3>
                <p className="text-xs text-white/75">{selected.sublabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/85">{selected.description}</p>

          {selected.href ? (
            selected.external ? (
              <a
                href={selected.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#13287a] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3aa0]"
              >
                開く
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            ) : (
              <Link
                href={selected.href}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#13287a] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3aa0]"
              >
                開く
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )
          ) : (
            <p className="mt-4 text-xs text-white/55">詳しくは会場ブースで。</p>
          )}
        </div>
      )}
    </div>
  );
}
