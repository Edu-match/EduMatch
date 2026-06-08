import type { Metadata } from "next";
import { Bebas_Neue, Shippori_Mincho } from "next/font/google";
import { CalendarDays, Building2, Mail, ChevronRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" });
const shippori = Shippori_Mincho({ weight: ["500"], subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "教育AIサミット | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 教育AIサミット。議員会館・AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報。会場：幕張メッセ。",
};

export default function InteropPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative flex flex-col justify-end overflow-hidden"
        style={{
          minHeight: "100svh",
          background: "linear-gradient(170deg, #01081c 0%, #030f38 40%, #071d70 80%, #0c2a96 100%)",
        }}
      >
        {/* グリッドオーバーレイ */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,150,255,0.07) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(100,150,255,0.07) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* 建物シルエット */}
        <svg
          aria-hidden
          className="absolute bottom-0 left-0 right-0 w-full"
          viewBox="0 0 1440 300"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.12 }}
        >
          <rect x="0"   y="80"  width="480" height="220" fill="#90b8ff" />
          <rect x="350" y="20"  width="100" height="280" fill="#a8caff" />
          <rect x="480" y="100" width="340" height="200" fill="#80a8f0" />
          <rect x="820" y="60"  width="200" height="240" fill="#9ab8f8" />
          <rect x="1020" y="120" width="420" height="180" fill="#7898e8" />
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
            <rect key={i} x={20 + i * 38} y="100" width="22" height="180" fill="none" stroke="#b0ccff" strokeWidth="0.6" />
          ))}
        </svg>

        {/* ボトムフェード */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{ height: "40%", background: "linear-gradient(to top, #01081c 0%, transparent 100%)" }}
        />

        {/* テキストブロック */}
        <div className="relative z-10 px-6 pb-16 sm:px-14 sm:pb-20 lg:pb-24">
          <div className="mx-auto max-w-6xl">

            {/* INTEROP TOKYO 2026 — 大きく目立つ扱い */}
            <p
              className={`${bebas.className} mb-4 text-[clamp(2.2rem,6vw,5rem)] leading-none tracking-wider`}
              style={{ color: "rgba(100,160,255,0.85)" }}
            >
              Interop Tokyo 2026
            </p>

            {/* メインタイトル */}
            <h1
              className={`${shippori.className} text-[clamp(3.5rem,12vw,10rem)] leading-[0.95] tracking-[0.05em] text-white`}
            >
              教育AI
              <br />
              サミット
            </h1>

            {/* サブコピー */}
            <p className="mt-8 max-w-md text-[clamp(0.9rem,2vw,1.1rem)] leading-relaxed text-white/60">
              生成AIで変わる教育の未来を体感せよ。<br />
              現場・政策・産業が一堂に会す最前線。
            </p>

            {/* 日時・会場 — バッジなし、テキストのみ */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/45">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                2026年6月10日–12日
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                幕張メッセ
              </span>
            </div>

          </div>
        </div>

        {/* 斜めカット */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "72px", background: "white", clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
        />
      </section>

      {/* ══════════════════════════════════════════
          インフォメーション・マップ
      ══════════════════════════════════════════ */}
      <section
        id="map"
        className="relative overflow-hidden px-6 py-20 sm:px-14 sm:py-24"
        style={{ background: "linear-gradient(160deg, #01081c 0%, #040f38 50%, #071d70 100%)" }}
      >
        {/* 上カット */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0"
          style={{ height: "72px", background: "white", clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        {/* 下カット */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "72px", background: "white", clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(120,180,255,0.25) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, #000 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, #000 30%, transparent 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl pt-6">
          <div className="mb-12">
            <p
              className={`${bebas.className} mb-1 text-[clamp(0.7rem,1.5vw,0.85rem)] tracking-[0.35em] text-blue-400`}
            >
              Information Map
            </p>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black tracking-tight text-white">
              インフォメーション・マップ
            </h2>
            <p className="mt-2 text-sm text-white/40">
              カテゴリを選択 → サブカテゴリ → 案内・タイムテーブルへ
            </p>
          </div>
          <InteropExplorer />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════ */}
      <section className="bg-white px-6 py-20 sm:px-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-[clamp(1.6rem,3.5vw,2.5rem)] font-black tracking-tight text-gray-900">
            お問い合わせ
          </h2>
          <p className="mb-8 text-sm text-gray-400">
            取材・協賛・登壇ご依頼はお気軽にどうぞ。
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:info@edu-match.com"
              className="inline-flex items-center gap-2 rounded-none border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900"
            >
              <Mail className="h-4 w-4" />
              info@edu-match.com
            </a>
            <a
              href="https://edu-match.com/contact"
              className="inline-flex items-center gap-2 rounded-none bg-gray-900 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80"
            >
              お問い合わせフォーム
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer
        className="px-6 py-10"
        style={{ background: "#01081c" }}
      >
        <div className="mx-auto max-w-6xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={`${bebas.className} text-xl tracking-widest text-white/70`}
            >
              Interop Tokyo 2026
            </p>
            <p className="text-[11px] font-black tracking-tight text-white/40">
              教育AIサミット
            </p>
          </div>
          <p className="text-[11px] text-white/25">
            青楓館高等学院 / みんがく / AI検定協会 / AI部 &nbsp;© 2026
          </p>
        </div>
      </footer>
    </main>
  );
}
