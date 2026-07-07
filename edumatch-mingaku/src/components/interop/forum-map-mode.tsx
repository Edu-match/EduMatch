"use client";

import { useEffect, useState } from "react";
import { Box, Map as MapIcon } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

/** 教育のひろばトップ：トップマップだけを 3D（デフォルト）⇄ 2D で切り替える。
 *  ドリルダウン（ハブ/カテゴリ/論点/コンテンツ）は 2D と完全に共有（同じ動作・同じ遷移）。 */
const STORE_KEY = "forum-map-mode";

export function ForumMapMode(props: React.ComponentProps<typeof InteropExplorer>) {
  // 3D ギャラクシービューをデフォルトに。明示的に 2D を選んだ場合だけ記憶して尊重する。
  const [mode, setMode] = useState<"2d" | "3d">("3d");

  useEffect(() => {
    // sessionStorage（React外部の状態）からの一度きりの復元
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { if (sessionStorage.getItem(STORE_KEY) === "2d") setMode("2d"); } catch { /* noop */ }
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
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all ${mode === "3d" ? "bg-primary text-white" : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"}`}
          aria-pressed={mode === "3d"}
        >
          <Box className="h-3.5 w-3.5" />3D
        </button>
        <button
          type="button"
          onClick={() => choose("2d")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all ${mode === "2d" ? "bg-primary text-white" : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"}`}
          aria-pressed={mode === "2d"}
        >
          <MapIcon className="h-3.5 w-3.5" />2D
        </button>
      </div>
    </>
  );
}
