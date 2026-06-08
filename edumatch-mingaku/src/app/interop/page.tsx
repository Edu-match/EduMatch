import type { Metadata } from "next";
import { MapPin, CalendarDays, Navigation, Mail } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

// 一般情報（編集可）。実際の会期・会場・連絡先に差し替えてください。
const INFO = [
  { icon: <CalendarDays className="h-5 w-5" />, title: "開催概要", body: "Interop Tokyo 2026。Education×AI の展示・登壇・案内をまとめています。" },
  { icon: <Navigation className="h-5 w-5" />, title: "会場・アクセス", body: "会場/ブース情報・アクセスはこちらに掲載します。" },
  { icon: <Mail className="h-5 w-5" />, title: "お問い合わせ", body: "ご質問・取材のお問い合わせはこちらから。" },
];

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
      <section className="container px-4 pb-12">
        <div className="mx-auto max-w-4xl">
          <InteropExplorer />
        </div>
      </section>

      {/* ===== 一般情報 ===== */}
      <section className="container px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-200/90">Information</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">開催・ご案内</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {INFO.map((it) => (
              <div key={it.title} className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-100" aria-hidden>
                  {it.icon}
                </span>
                <h3 className="mt-3 text-base font-bold">{it.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-white/80">{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-white/65">
        <p>Interop Tokyo 2026 ・ インフォメーション</p>
        <p className="mt-2 text-white/45">© 2026</p>
      </footer>
    </main>
  );
}
