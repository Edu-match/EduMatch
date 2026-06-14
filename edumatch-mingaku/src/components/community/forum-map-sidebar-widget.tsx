import Link from "next/link";
import { MessagesSquare, ArrowUpRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

/**
 * サイドバーの「井戸端会議マップ」ミニ。
 * 本物の井戸端マップ(InteropExplorer)を原寸のまま描画し、外枠(overflow-hidden)で
 * 中心（議員会館）付近を窓のように切り抜く。マップは操作可能：ドラッグでパン・泡タップで話題へ。
 * 右上の「ひらく」で全画面の /forum を開く。
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

      {/* 操作できる原寸マップを“のぞき窓”に切り抜き */}
      <div className="relative h-72 w-full overflow-hidden bg-[#070a1c]">
        {/* 原寸の井戸端マップ（中心＝議員会館 を窓の中央付近に）。ドラッグでパン可能 */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ width: 760, height: 520, top: -100 }}
        >
          <InteropExplorer embedded showChat={false} guideText="" />
        </div>

        {/* 縁を軽く落として“のぞき窓”感（操作は邪魔しない） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 38px 12px rgba(7,10,28,0.6)" }}
        />
      </div>
    </div>
  );
}
