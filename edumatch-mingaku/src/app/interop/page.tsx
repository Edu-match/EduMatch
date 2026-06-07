import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkles, MessageCircle, GraduationCap, Layers, Loader2 } from "lucide-react";
import { ForumCategoryExplorer } from "@/components/community/forum-category-explorer";

export const metadata: Metadata = {
  title: "Interop Tokyo 2026 特設 | エデュマッチ",
  description:
    "Interop Tokyo 2026 のエデュマッチブース特設ページ。教育×AIの今を、ひとつのマップから。気になるテーマに飛び込んで、その場で会員登録。",
};

const HIGHLIGHTS: { label: string; desc: string; href: string; icon: React.ReactNode }[] = [
  { label: "井戸端会議", desc: "教育の今を語り合うマップ型コミュニティ", href: "/forum", icon: <MessageCircle className="h-5 w-5" /> },
  { label: "AI検定", desc: "AI活用のスキルを可視化する検定", href: "/ai-kentei", icon: <GraduationCap className="h-5 w-5" /> },
  { label: "サービス一覧", desc: "教育×AIのサービスをまとめて比較", href: "/services", icon: <Layers className="h-5 w-5" /> },
];

export default function InteropLandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* 背景：Interop調の青グラデ＋発光＋サイバーグリッド */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{ background: "linear-gradient(160deg, #0a1a5c 0%, #1c3aa0 45%, #2f63d8 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 55% at 50% 0%, rgba(120,170,255,0.35) 0%, transparent 60%), radial-gradient(60% 50% at 90% 20%, rgba(150,110,255,0.22) 0%, transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 30%, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 30%, transparent 80%)",
        }}
      />

      {/* ===== Hero ===== */}
      <section className="container flex flex-col items-center px-4 pb-10 pt-12 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          INTEROP TOKYO 2026 ・ エデュマッチ特設
        </span>

        <h1 className="mt-6 max-w-3xl text-balance text-[28px] font-extrabold leading-tight tracking-tight sm:text-5xl">
          教育×AIの最前線が、
          <br className="hidden sm:block" />
          ここで<span className="bg-gradient-to-r from-cyan-200 to-sky-100 bg-clip-text text-transparent">全部つながる</span>。
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-white/85 sm:text-base">
          会場で気になったサービス・事例・登壇を、その場でブックマーク。登録すれば、ブースを離れても比較・資料請求・最新情報がエデュマッチに残ります。
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/login?tab=signup&next=/interop"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-bold text-[#13287a] shadow-lg shadow-blue-900/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3aa0] motion-reduce:transform-none sm:w-auto"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            いますぐ会員登録（無料・30秒）
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            href="#booth-map"
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white/90 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3aa0]"
          >
            ブースマップを見る
          </Link>
        </div>
        <p className="mt-3 text-xs text-white/70">メール登録だけ・営業電話はありません。</p>
      </section>

      {/* ===== ブースマップ（井戸端マップ埋め込み） ===== */}
      <section id="booth-map" className="container scroll-mt-20 px-4 pb-12">
        <div className="mb-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-200/90">Booth Map</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">気になるテーマに、飛び込もう</h2>
          <p className="mt-2 text-sm text-white/80">タップでテーマを開く／二本指で拡大。記事・サービス・動画・コミュニティへ。</p>
        </div>
        <div className="rounded-[2rem] border border-white/15 bg-white/5 p-2 shadow-2xl shadow-blue-950/40 backdrop-blur-sm sm:p-3">
          <Suspense
            fallback={
              <div className="flex min-h-[420px] items-center justify-center text-white/70">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                マップを読み込み中…
              </div>
            }
          >
            <ForumCategoryExplorer embedded />
          </Suspense>
        </div>
      </section>

      {/* ===== ハイライト導線 ===== */}
      <section className="container px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <Link
              key={h.label}
              href={h.href}
              className="group flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3aa0]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-100" aria-hidden>
                {h.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-base font-bold">
                  {h.label}
                  <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-white/80">{h.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== 下部CTA ===== */}
      <section className="container px-4 pb-24">
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#1c3aa0]/70 to-[#0a1a5c]/60 px-6 py-10 text-center backdrop-blur">
          <h2 className="text-xl font-bold sm:text-2xl">会場で見たものを、ずっと手元に。</h2>
          <p className="mt-2 max-w-md text-sm text-white/85">
            登録は無料。Interop が終わっても、教育×AIの最新がエデュマッチで続きます。マイページから比較・資料請求・フォローができます。
          </p>
          <Link
            href="/login?tab=signup&next=/interop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-bold text-[#13287a] shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c3aa0] motion-reduce:transform-none"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            無料で会員登録する
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ===== 最小フッター（公開物としての信頼性導線） ===== */}
      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-white/70">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/" className="hover:text-white hover:underline">エデュマッチ トップ</Link>
          <Link href="/about" className="hover:text-white hover:underline">運営について</Link>
          <Link href="/terms" className="hover:text-white hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:text-white hover:underline">プライバシー</Link>
          <Link href="/contact" className="hover:text-white hover:underline">お問い合わせ</Link>
        </nav>
        <p className="mt-4 text-white/55">© 2026 エデュマッチ（運営：株式会社スタディパーク）</p>
      </footer>
    </main>
  );
}
