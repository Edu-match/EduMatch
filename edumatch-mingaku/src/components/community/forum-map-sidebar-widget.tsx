import Link from "next/link";
import { MessagesSquare, ChevronRight } from "lucide-react";

/**
 * サイドバーの「井戸端マップ」ミニ。
 * スマホのモックアップ枠の中に井戸端マップ風のビュー（暗い宇宙＋光る玉）を入れ、
 * 画面端で切り抜かれた“スマホ表示の一部”に見せる。全体タップで /forum へ。
 */

// 玉（一部は画面端で切り抜かれる＝「切り抜いている」演出）
const BUBBLES: Array<{ label: string; x: number; y: number; size: number; glow: string }> = [
  { label: "AI・テク", x: 50, y: 26, size: 58, glow: "#3a90f0" },
  { label: "評価", x: 21, y: 48, size: 40, glow: "#38c038" },
  { label: "教師", x: 80, y: 50, size: 44, glow: "#e0a010" },
  { label: "権利", x: 40, y: 72, size: 38, glow: "#e83030" },
  { label: "多様性", x: 84, y: 86, size: 42, glow: "#9030e0" }, // 右下で切り抜かれる
  { label: "教科", x: 10, y: 84, size: 36, glow: "#4860d8" }, // 左下で切り抜かれる
];

const STARS = [
  { x: 18, y: 16, d: 1.3 }, { x: 70, y: 12, d: 1 }, { x: 44, y: 20, d: 1.4 },
  { x: 86, y: 30, d: 1 }, { x: 28, y: 62, d: 1.1 }, { x: 62, y: 66, d: 1.2 },
];

export function ForumMapSidebarWidget() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 p-3">
        <MessagesSquare className="h-4 w-4 shrink-0 text-[#6366f1]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight">井戸端マップ</h3>
          <p className="text-xs leading-tight text-muted-foreground">スマホでのぞく井戸端会議</p>
        </div>
      </div>

      {/* スマホのモックアップ（中の井戸端は画面端で切り抜かれる） */}
      <div className="flex justify-center px-3 pb-4">
        <Link
          href="/forum"
          aria-label="井戸端会議をひらく"
          className="group relative block transition-transform duration-200 hover:-translate-y-0.5"
        >
          <div
            className="relative w-[158px] rounded-[1.9rem] border-[6px] border-[#0a0e22] bg-[#0a0e22] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]"
            style={{ aspectRatio: "9 / 18.5" }}
          >
            {/* ノッチ */}
            <div className="absolute left-1/2 top-1 z-20 h-3 w-16 -translate-x-1/2 rounded-full bg-[#0a0e22]" />

            {/* 画面（ここで overflow-hidden → 井戸端が切り抜かれる） */}
            <div
              className="absolute inset-0 overflow-hidden rounded-[1.35rem]"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% 22%, #18224f 0%, #070a1c 68%, #05060f 100%)",
              }}
            >
              {/* ステータスバー */}
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-1.5 text-[7px] font-bold text-white/70">
                <span>9:41</span>
                <span className="tracking-wide">井戸端会議</span>
                <span>▮▮▮</span>
              </div>

              {/* 星 */}
              {STARS.map((s, i) => (
                <span
                  key={i}
                  className="absolute rounded-full bg-white/80"
                  style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.d, height: s.d }}
                />
              ))}

              {/* 玉（端で切り抜かれる） */}
              {BUBBLES.map((b) => (
                <div
                  key={b.label}
                  className="absolute flex items-center justify-center rounded-full"
                  style={{
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    width: b.size,
                    height: b.size,
                    transform: "translate(-50%, -50%)",
                    background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.5) 0%, ${b.glow}33 52%, rgba(10,20,60,0.32) 100%)`,
                    border: `1.5px solid ${b.glow}99`,
                    boxShadow: `0 0 12px ${b.glow}66, inset 0 0 8px rgba(255,255,255,0.2)`,
                  }}
                >
                  <span
                    className="select-none px-1 text-center font-bold leading-none text-white [word-break:keep-all]"
                    style={{ fontSize: 8, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                  >
                    {b.label}
                  </span>
                </div>
              ))}

              {/* 下部のタップ誘導（ホームバー風） */}
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-7 text-center">
                <span className="text-[9px] font-bold text-white/90">タップでひらく</span>
                <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-white/40" />
              </div>
            </div>
          </div>
        </Link>
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
