import Link from "next/link";
import { MessagesSquare, ArrowUpRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

/**
 * サイドバーの「井戸端会議マップ」ミニ。
 * 本物の井戸端マップ(InteropExplorer)を拡大表示し、ドラッグでパン・泡タップで話題へ。
 * 右上「ひらく」で全画面の /forum。明るめテーマ＋初期ズームで暗さ/可動域の狭さを解消。
 */
export function ForumMapSidebarWidget() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ヘッダー（タイトル＋ひらくボタン） */}
      <div className="flex items-center gap-2 px-3.5 py-3">
        <MessagesSquare className="h-4 w-4 shrink-0 text-[#6366f1]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight">井戸端会議マップ</h3>
          <p className="text-xs leading-tight text-muted-foreground">
            ドラッグで動かす・泡をタップ
          </p>
        </div>
        <Link
          href="/forum"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full border px-2.5 py-1 text-[11px] font-bold text-[#1d4ed8] transition-colors hover:bg-muted"
        >
          ひらく <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 本物マップを拡大表示（ドラッグでパン・泡タップで話題へ）。明るめテーマで暗さを解消 */}
      <div className="relative h-72 w-full overflow-hidden bg-[#16224f]">
        <InteropExplorer
          embedded
          showChat={false}
          guideText=""
          themeMode="auto"
          initialScale={2.2}
        />
        {/* ごく薄い縁（暗くしすぎない） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 28px 4px rgba(7,10,28,0.3)" }}
        />
      </div>
    </div>
  );
}
