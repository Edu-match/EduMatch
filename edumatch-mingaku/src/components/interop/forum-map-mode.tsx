"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Box, Map as MapIcon, Loader2 } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";
import type { InteropPriorityTopic } from "@/lib/interop-priority-topics";

const ForumGalaxy3D = dynamic(
  () => import("@/components/interop/forum-galaxy-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center text-sm text-white/60">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          3Dビューを読み込み中…
        </span>
      </div>
    ),
  }
);

const STORE_KEY = "forum-map-mode";

export function ForumMapMode(
  props: React.ComponentProps<typeof InteropExplorer>
) {
  const router = useRouter();
  const [mode, setMode] = useState<"2d" | "3d">("3d");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORE_KEY) === "2d") setMode("2d");
    } catch {
      /* noop */
    }
  }, []);
  const choose = (m: "2d" | "3d") => {
    setMode(m);
    try {
      sessionStorage.setItem(STORE_KEY, m);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      {mode === "3d" ? (
        <ForumGalaxy3D
          centerLabel={props.centerLabel}
          onSelectCenter={() => router.push("/kaikan")}
          onSelectTopic={(t: InteropPriorityTopic) => {
            if (t.roomId)
              router.push(`/forum/${t.roomId}?from=interop`);
          }}
        />
      ) : (
        <InteropExplorer {...props} />
      )}

      {/* 3D / 2D 切替（右上・ガラスピル） */}
      <div className="absolute right-3 top-3 z-40 inline-flex overflow-hidden rounded-full border border-[#1a3a5a]/20 bg-white/80 shadow-lg shadow-black/10 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => choose("3d")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all ${
            mode === "3d"
              ? "bg-primary text-white"
              : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"
          }`}
          aria-pressed={mode === "3d"}
        >
          <Box className="h-3.5 w-3.5" />
          3D
        </button>
        <button
          type="button"
          onClick={() => choose("2d")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all ${
            mode === "2d"
              ? "bg-primary text-white"
              : "text-[#1a3a5a]/60 hover:text-[#1a3a5a]"
          }`}
          aria-pressed={mode === "2d"}
        >
          <MapIcon className="h-3.5 w-3.5" />
          2D
        </button>
      </div>
    </>
  );
}
