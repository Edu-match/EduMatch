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
  // ※ hydration 不整合（React #418）を避けるため、サーバー/初回クライアント描画は
  //   常に "3d" で一致させ、マウント直後（3D チャンク読込前）に実効モードへ切替える。
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // sessionStorage / 画面幅（React外部の状態）からの一度きりの初期化
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const s = sessionStorage.getItem(STORE_KEY);
      if (s === "2d" || s === "3d") { setMode(s); return; }
    } catch { /* noop */ }
    if (window.matchMedia("(max-width: 768px)").matches) setMode("2d");
  }, []);
  const choose = (m: "2d" | "3d") => { setMode(m); try { sessionStorage.setItem(STORE_KEY, m); } catch { /* noop */ } };

  // マウント前はサーバーと同一の "3d" を描画して不整合を防ぐ
  //（3D/2D の地図本体は ssr:false のため、この時点で WebGL はまだ動かない）
  const effectiveMode = mounted ? mode : "3d";

  return (
    <>
      <InteropExplorer {...props} mapMode={effectiveMode} />

      {/* 3D / 2D 切替（右上・ガラスピル） */}
      <div className="absolute right-3 top-3 z-40 inline-flex overflow-hidden rounded-full border border-[#1a3a5a]/20 bg-white/80 shadow-lg shadow-black/10 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => choose("3d")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all ${effectiveMode === "3d" ? "bg-primary text-white" : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"}`}
          aria-pressed={effectiveMode === "3d"}
        >
          <Box className="h-3.5 w-3.5" />3D
        </button>
        <button
          type="button"
          onClick={() => choose("2d")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all ${effectiveMode === "2d" ? "bg-primary text-white" : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"}`}
          aria-pressed={effectiveMode === "2d"}
        >
          <MapIcon className="h-3.5 w-3.5" />2D
        </button>
      </div>
    </>
  );
}
