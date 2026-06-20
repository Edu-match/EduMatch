"use client";

import { useEffect, useState } from "react";
import { Box, Map as MapIcon } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

/** 井戸端トップ：トップマップだけを 2D ⇄ 3D で切り替える。
 *  ドリルダウン（ハブ/カテゴリ/論点/コンテンツ）は 2D と完全に共有（同じ動作・同じ遷移）。 */
const STORE_KEY = "forum-map-mode";

export function ForumMapMode(props: React.ComponentProps<typeof InteropExplorer>) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");

  // 掲示板へ入って戻ってきても3Dのままにする（セッション内で記憶）。
  useEffect(() => {
    try { if (sessionStorage.getItem(STORE_KEY) === "3d") setMode("3d"); } catch { /* noop */ }
  }, []);
  const choose = (m: "2d" | "3d") => { setMode(m); try { sessionStorage.setItem(STORE_KEY, m); } catch { /* noop */ } };

  return (
    <>
      <InteropExplorer {...props} mapMode={mode} />

      {/* 2D / 3D 切替（右上） */}
      <div className="absolute right-3 top-3 z-40 inline-flex overflow-hidden rounded-full border border-white/15 bg-[#0a1024]/80 backdrop-blur">
        <button
          type="button"
          onClick={() => choose("2d")}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${mode === "2d" ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}
        >
          <MapIcon className="h-3.5 w-3.5" />2D
        </button>
        <button
          type="button"
          onClick={() => choose("3d")}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${mode === "3d" ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}
        >
          <Box className="h-3.5 w-3.5" />3D
        </button>
      </div>
    </>
  );
}
