"use client";

import Link from "next/link";
import { MessagesSquare, ChevronRight } from "lucide-react";

/**
 * サイドバーPR枠に置く「井戸端マップ」プロモWidget。
 *
 * 本物のバブルマップ（InteropPuyoBubbleMap / InteropExplorer）はフルスクリーン前提・
 * 活動量データを大量に要求するため、230px幅のサイドバーへ生で埋め込むとレイアウトが崩れる。
 * ここでは同じビジュアル言語（暗い宇宙背景＋光るガラスバブル）の軽量プレビューを描画し、
 * クリックで本物のマップが動く /forum へ誘導する。
 */

type PreviewBubble = {
  label: string;
  /** カード内の位置（%） */
  x: number;
  y: number;
  /** 直径（px） */
  size: number;
  /** グロー色 */
  glow: string;
  tint: string;
};

// 5グループ配色（interop-puyo-bubble-map の GROUP_STYLE と同系統）
const BUBBLES: PreviewBubble[] = [
  { label: "AI", x: 50, y: 47, size: 58, glow: "#3a90f0", tint: "rgba(80,160,255,0.18)" },
  { label: "評価", x: 24, y: 30, size: 38, glow: "#38c038", tint: "rgba(60,200,80,0.18)" },
  { label: "教師", x: 76, y: 31, size: 42, glow: "#e0a010", tint: "rgba(230,170,20,0.18)" },
  { label: "規律", x: 28, y: 70, size: 34, glow: "#e83030", tint: "rgba(240,70,60,0.18)" },
  { label: "多様性", x: 75, y: 69, size: 36, glow: "#9030e0", tint: "rgba(160,60,240,0.18)" },
];

const FX = `
  @keyframes fmsBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes fmsTwinkle { 0%,100% { opacity: 0.2; } 50% { opacity: 0.9; } }
`;

export function ForumMapSidebarWidget() {
  return (
    <Link
      href="/forum"
      className="group block overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
      aria-label="AIUEO 井戸端会議のマップを開く"
    >
      <style>{FX}</style>

      {/* マッププレビュー（暗い宇宙背景＋ガラスバブル） */}
      <div
        className="relative h-40 w-full overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 35%, #0e1640 0%, #070a1c 70%, #05060f 100%)",
        }}
      >
        {/* 星 */}
        {STAR_POS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.d,
              height: s.d,
              animation: `fmsTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}

        {/* バブル */}
        {BUBBLES.map((b, i) => (
          <div
            key={b.label}
            className="absolute flex items-center justify-center rounded-full"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45) 0%, ${b.tint} 55%, rgba(10,20,60,0.28) 100%)`,
              border: `1px solid ${b.glow}55`,
              boxShadow: `0 0 14px ${b.glow}66, inset 0 0 8px rgba(255,255,255,0.18)`,
              animation: `fmsBob ${3 + (i % 3) * 0.6}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >
            <span
              className="select-none text-[10px] font-bold text-white/90"
              style={{ textShadow: "0 0 6px rgba(0,0,0,0.6)" }}
            >
              {b.label}
            </span>
          </div>
        ))}

        {/* 下部グラデ（タイトル可読性） */}
        <div
          className="absolute inset-x-0 bottom-0 h-12"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(7,10,28,0.85) 100%)",
          }}
        />
      </div>

      {/* タイトル＋CTA */}
      <div className="flex items-center gap-2 bg-card p-3">
        <MessagesSquare className="h-4 w-4 shrink-0 text-[#6366f1]" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold leading-tight">井戸端マップ</h3>
          <p className="text-xs text-muted-foreground leading-tight">
            テーマ別の部屋で語り合う
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// 星の固定座標（SSR/CSRで揺れないよう決め打ち）
const STAR_POS = [
  { x: 12, y: 18, d: 1.4, delay: 0, dur: 3.2 },
  { x: 88, y: 14, d: 1.1, delay: 1.1, dur: 4.0 },
  { x: 62, y: 22, d: 1.6, delay: 0.6, dur: 3.6 },
  { x: 40, y: 12, d: 1.0, delay: 2.0, dur: 4.4 },
  { x: 18, y: 52, d: 1.2, delay: 1.6, dur: 3.0 },
  { x: 92, y: 58, d: 1.3, delay: 0.3, dur: 3.8 },
  { x: 55, y: 85, d: 1.0, delay: 2.4, dur: 4.2 },
  { x: 33, y: 90, d: 1.1, delay: 1.0, dur: 3.4 },
];
