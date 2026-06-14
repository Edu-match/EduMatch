import Link from "next/link";
import { MessagesSquare, ChevronRight } from "lucide-react";
import { ForumThemeMinimap } from "@/components/community/forum-theme-minimap";

/**
 * サイドバーPR枠の「井戸端マップ」Widget。
 * 6つの大テーマのミニマップ（ForumThemeMinimap）を表示し、各テーマの玉タップで
 * /forum?group=X（そのテーマの井戸端）へ。下部リンクで井戸端トップへ。
 */
export function ForumMapSidebarWidget() {
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 bg-card p-3">
        <MessagesSquare className="h-4 w-4 shrink-0 text-[#6366f1]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight">井戸端マップ</h3>
          <p className="text-xs leading-tight text-muted-foreground">テーマを選んで話に入る</p>
        </div>
      </div>

      {/* 6テーマのミニマップ（玉タップで /forum?group=X） */}
      <div className="h-56 w-full">
        <ForumThemeMinimap variant="sidebar" />
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
