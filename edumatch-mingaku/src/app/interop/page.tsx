import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

export const metadata: Metadata = {
  title: "インフォメーション | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 のインフォメーション。インフォメーションを中心に、議員会館・AI検定・インタロップ・エデュマッチ・AI部の案内・記事・タイムテーブルをマップから。",
};

export default function InteropPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{ background: "linear-gradient(160deg, #0a1a5c 0%, #1c3aa0 45%, #2f63d8 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 55% at 50% 0%, rgba(120,170,255,0.35) 0%, transparent 60%), radial-gradient(60% 50% at 90% 18%, rgba(150,110,255,0.2) 0%, transparent 55%)",
        }}
      />

      {/* ===== Hero ===== */}
      <section className="container flex flex-col items-center px-4 pb-8 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          INTEROP TOKYO 2026 ・ インフォメーション
        </span>

        <h1 className="mt-6 max-w-2xl text-balance text-[28px] font-extrabold leading-tight tracking-tight sm:text-5xl">
          知りたいことを、
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-cyan-200 to-sky-100 bg-clip-text text-transparent">マップ</span>から。
        </h1>
        <p className="mt-4 max-w-lg text-pretty text-[15px] leading-relaxed text-white/85 sm:text-base">
          中央のインフォメーションを起点に、各カテゴリを選んでサブカテゴリ・案内記事（タイムテーブル等）へ。
        </p>
      </section>

      {/* ===== インフォメーション・マップ ===== */}
      <section className="container px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <InteropExplorer />
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-white/65">
        <p>Interop Tokyo 2026 ・ インフォメーション</p>
        <p className="mt-2 text-white/45">© 2026</p>
      </footer>
    </main>
  );
}
