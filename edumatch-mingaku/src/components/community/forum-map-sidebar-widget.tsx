import Link from "next/link";
import { MessagesSquare, ChevronRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

/**
 * サイドバーの「井戸端マップ」ミニ。
 * 本物の井戸端会議のUI（マップ）を、そのままミニマップの大きさに切り抜いて（overflow-hidden）
 * プレビュー表示する。マップ自体は操作させず、全体タップで /forum を開く。
 */
export function ForumMapSidebarWidget() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 p-3">
        <MessagesSquare className="h-4 w-4 shrink-0 text-[#6366f1]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight">井戸端マップ</h3>
          <p className="text-xs leading-tight text-muted-foreground">のぞいて話に入る</p>
        </div>
      </div>

      {/* 本物の井戸端UIをミニマップサイズに切り抜き（操作はさせずタップで開く） */}
      <div className="relative h-64 w-full overflow-hidden bg-[#070a1c]">
        <InteropExplorer embedded showChat={false} guideText="" />

        {/* マップ操作を無効化し、タップで井戸端会議を開くオーバーレイ */}
        <Link
          href="/forum"
          aria-label="井戸端会議をひらく"
          className="absolute inset-0 z-30"
        />
        {/* 下部のタップ誘導 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-8 text-center">
          <span className="text-[11px] font-bold text-white/90">タップでひらく</span>
        </div>
      </div>

      {/* フッター：井戸端トップへ */}
      <Link
        href="/forum"
        className="flex items-center justify-center gap-1 border-t bg-card px-3 py-2.5 text-sm font-medium text-[#1d4ed8] transition-colors hover:bg-muted"
      >
        井戸端会議をすべて見る
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
