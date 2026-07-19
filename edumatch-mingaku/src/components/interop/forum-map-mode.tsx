"use client";

import { useEffect, useState } from "react";
import { Box, Map as MapIcon } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

/** 教育のひろばトップ：トップマップだけを 3D（デフォルト）⇄ 2D で切り替える。
 *  ドリルダウン（ハブ/カテゴリ/論点/コンテンツ）は 2D と完全に共有（同じ動作・同じ遷移）。 */
const STORE_KEY = "forum-map-mode";

export function ForumMapMode(props: React.ComponentProps<typeof InteropExplorer>) {
  // 3D ギャラクシービューをデフォルトに（PC）。ただしスマホは WebGL のメモリ制約で
  // Safari がクラッシュ（"This page couldn't load"）しやすいため 2D を既定にする。
  // 明示的に選んだビューは sessionStorage に記憶して尊重する。
  // ※ 3D/2D いずれも ssr:false のためサーバーは地図本体を描画せず、初期 mode の
  //   クライアント判定でハイドレーション不整合は起きない。
  const [mode, setMode] = useState<"2d" | "3d">(() => {
    if (typeof window === "undefined") return "3d";
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved === "2d" || saved === "3d") return saved;
    } catch { /* noop */ }
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    return isMobile ? "2d" : "3d";
  });

  useEffect(() => {
    // sessionStorage（React外部の状態）からの一度きりの復元（保存済みのみ尊重）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const s = sessionStorage.getItem(STORE_KEY); if (s === "2d" || s === "3d") setMode(s); } catch { /* noop */ }
  }, []);
  const choose = (m: "2d" | "3d") => { setMode(m); try { sessionStorage.setItem(STORE_KEY, m); } catch { /* noop */ } };

  return (
    <>
      <InteropExplorer {...props} mapMode={mode} />

      {/* 3D / 2D 切替（右上・ガラスピル） */}
      <div className="absolute right-3 top-3 z-40 inline-flex overflow-hidden rounded-full border border-[#1a3a5a]/20 bg-white/80 shadow-lg shadow-black/10 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => choose("3d")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all ${mode === "3d" ? "bg-primary text-white" : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"}`}
          aria-pressed={mode === "3d"}
        >
          <Box className="h-3.5 w-3.5" />3D
        </button>
        <button
          type="button"
          onClick={() => choose("2d")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all ${mode === "2d" ? "bg-primary text-white" : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"}`}
          aria-pressed={mode === "2d"}
        >
          <MapIcon className="h-3.5 w-3.5" />2D
        </button>
      </div>
    </>
  );
}
