import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { InteropHubMap } from "@/components/interop/interop-hub-map";

export const metadata: Metadata = {
  title: "総合案内所 | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 の総合案内所。議員会館・AI検定・インタロップ・エデュマッチ・AI部を、マップから選んでチェック。",
};

export default function InteropHubPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* 背景：青グラデ＋発光＋サイバーグリッド */}
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
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 25%, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 25%, #000 30%, transparent 80%)",
        }}
      />

      {/* ===== Hero ===== */}
      <section className="container flex flex-col items-center px-4 pb-8 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          総合案内所 ・ INTEROP TOKYO 2026
        </span>

        <h1 className="mt-6 max-w-2xl text-balance text-[28px] font-extrabold leading-tight tracking-tight sm:text-5xl">
          気になるブースに、
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-cyan-200 to-sky-100 bg-clip-text text-transparent">飛び込もう</span>。
        </h1>
        <p className="mt-4 max-w-lg text-pretty text-[15px] leading-relaxed text-white/85 sm:text-base">
          議員会館・AI検定・インタロップ・エデュマッチ・AI部。
          マップのバブルをタップして、それぞれの中身をチェックできます。
        </p>
      </section>

      {/* ===== 案内所マップ ===== */}
      <section className="container px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <InteropHubMap />
        </div>
      </section>

      {/* ===== 最小フッター ===== */}
      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-white/65">
        <p>Interop Tokyo 2026 ・ 総合案内所</p>
        <p className="mt-2 text-white/45">© 2026</p>
      </footer>
    </main>
  );
}
