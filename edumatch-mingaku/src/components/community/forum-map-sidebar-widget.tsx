import Link from "next/link";
import { MessagesSquare, ArrowRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

/**
 * サイドバーの「井戸端会議マップ」ミニ。
 * 本物の井戸端マップ(InteropExplorer)を“原寸のまま”描画し、外枠(overflow-hidden)で
 * 中心（議員会館）付近だけを窓のように切り抜く。縁のビネットで中心に視線を集め、
 * マップ自体は操作させず、全体タップで /forum を開く。
 */
export function ForumMapSidebarWidget() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-3.5 py-3">
        <MessagesSquare className="h-4 w-4 shrink-0 text-[#6366f1]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight">井戸端会議マップ</h3>
          <p className="text-xs leading-tight text-muted-foreground">
            テーマの泡をのぞいて議論に参加
          </p>
        </div>
      </div>

      {/* 原寸マップを切り抜いた“のぞき窓”。全体が /forum へのリンク */}
      <Link
        href="/forum"
        aria-label="井戸端会議をひらく"
        className="group relative block h-72 w-full overflow-hidden bg-[#070a1c]"
      >
        {/* 原寸の井戸端マップ（中心＝議員会館 を窓の中央に）。操作は無効化（プレビュー） */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ width: 760, height: 520, top: -100 }}
        >
          <InteropExplorer embedded showChat={false} guideText="" />
        </div>

        {/* 縁のビネット（窓っぽさ・中心への視線誘導） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 46px 16px rgba(7,10,28,0.92)" }}
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />

        {/* ライブ表示 */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9px] font-bold tracking-wide text-white/85">
            リアルタイム議論
          </span>
        </div>

        {/* 下部グラデ＋CTA（常時表示・ホバーで強調） */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/85 via-black/25 to-transparent pb-3 pt-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-[#1a3a8a] shadow-lg transition-transform duration-200 group-hover:scale-105">
            井戸端をひらく
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}
