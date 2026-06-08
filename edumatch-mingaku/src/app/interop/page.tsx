import type { Metadata } from "next";
import { MapPin, CalendarDays, Building2, Mail, ExternalLink, ChevronRight } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

export const metadata: Metadata = {
  title: "教育AIサミット | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 教育AIサミット。議員会館・AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報。会場：幕張メッセ。",
};

export default function InteropPage() {
  return (
    <main className="min-h-screen bg-white font-sans antialiased">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "520px", height: "65svh" }}
      >
        {/* 背景：CSS建物アート（/public/images/makuhari-hero.jpg があればそちらを使用） */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "linear-gradient(165deg, #020b22 0%, #04174a 35%, #082880 65%, #0b3399 100%)",
          }}
        />
        {/* ガラスファサード風グリッド */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(180,210,255,1) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(180,210,255,1) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        {/* 建物シルエット */}
        <svg
          aria-hidden
          className="absolute bottom-0 left-0 right-0 w-full opacity-[0.16]"
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="80"  y="40"  width="540" height="180" fill="#a0c0ff" />
          <polygon points="80,40 0,110 0,220 80,220" fill="#8ab0f0" />
          <rect x="400" y="0"  width="120" height="220" fill="#b0ccff" />
          <rect x="640" y="70" width="360" height="150" fill="#90b8f8" />
          <rect x="1000" y="110" width="440" height="110" fill="#7aa8f0" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={100 + i * 60} y="60" width="40" height="140" fill="none" stroke="#c0d8ff" strokeWidth="0.8" />
          ))}
        </svg>
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-36"
          style={{ background: "linear-gradient(to top, rgba(2,11,34,0.75) 0%, transparent 100%)" }}
        />

        {/* テキストオーバーレイ */}
        <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-12 sm:px-12 sm:pb-14">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded border border-white/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                Interop Tokyo 2026
              </span>
            </div>
            <h1 className="text-[40px] font-black leading-none tracking-tighter text-white sm:text-[68px] lg:text-[80px]">
              教育AI<wbr />サミット
            </h1>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-white/70 sm:text-base">
              生成AIで変わる教育の未来を体感せよ。
              現場・政策・産業が一堂に会す、教育×AIの最前線。
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-[13px]">
              {[
                { icon: <CalendarDays className="h-3.5 w-3.5" />, text: "2026年6月10日–12日" },
                { icon: <Building2 className="h-3.5 w-3.5" />, text: "幕張メッセ" },
                { icon: <MapPin className="h-3.5 w-3.5" />, text: "ブース 8A14" },
              ].map((b) => (
                <span key={b.text} className="inline-flex items-center gap-1.5 text-white/65">
                  {b.icon} {b.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 下端の斜めカット */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "60px", background: "white", clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
        />
      </section>

      {/* ══════════════════════════════════════════
          OVERVIEW
      ══════════════════════════════════════════ */}
      <section className="bg-white px-6 py-14 sm:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { no: "01", title: "キッカケ格差をなくす", body: "生成AIの恩恵を受けられる学生・教員の偏りを打破。正しい理解と実践の場を提供します。" },
              { no: "02", title: "現場・政策・産業を繋ぐ", body: "高校生・教員・議員・企業が一堂に会し、教育×AIの未来を共創します。" },
              { no: "03", title: "体験型の展示・登壇", body: "講演・ライブデモ・AI検定体験など、来場者が直接触れる機会を用意します。" },
            ].map((c) => (
              <div key={c.no}>
                <p className="mb-2 text-[11px] font-black tracking-[0.2em] text-sky-500">{c.no}</p>
                <h3 className="mb-2 text-base font-bold text-gray-900">{c.title}</h3>
                <p className="text-[13px] leading-relaxed text-gray-500">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          インフォメーション・マップ（中心）
      ══════════════════════════════════════════ */}
      <section
        id="map"
        className="relative overflow-hidden px-6 py-16 sm:px-12 sm:py-20"
        style={{ background: "linear-gradient(160deg, #030e28 0%, #061e5a 50%, #092880 100%)" }}
      >
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0"
          style={{ height: "60px", background: "white", clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "60px", background: "white", clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(180,210,255,1) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(180,210,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">
              Information Map
            </p>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              インフォメーション・マップ
            </h2>
            <p className="mt-3 text-[13px] text-white/50">
              カテゴリを選択 → サブカテゴリ → 案内・タイムテーブルへ
            </p>
          </div>
          <InteropExplorer />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          EVENT INFO
      ══════════════════════════════════════════ */}
      <section className="bg-white px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-5xl grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="mb-6 text-2xl font-black tracking-tight text-gray-900">開催概要</h2>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["名称",  "教育AIサミット × Interop Tokyo 2026"],
                  ["会期",  "2026年6月10日（水）〜12日（金）"],
                  ["時間",  "10:00–17:00（最終日 〜16:30）"],
                  ["会場",  "幕張メッセ（千葉市美浜区）"],
                  ["ブース","8A14（Education×AI ゾーン）"],
                  ["入場",  "Interop Tokyo 2026 来場登録（無料）"],
                ].map(([l, v]) => (
                  <tr key={l} className="border-b border-gray-100">
                    <td className="py-3 pr-4 align-top text-[11px] font-bold uppercase tracking-wide text-gray-400 w-14">{l}</td>
                    <td className="py-3 text-gray-800 leading-snug">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="mb-6 text-2xl font-black tracking-tight text-gray-900">アクセス</h2>
            <div className="space-y-4 text-[13px]">
              {[
                { icon: "🚃", label: "JR・京葉線", body: "海浜幕張駅 南口より徒歩約5分" },
                { icon: "🚍", label: "バス",       body: "幕張メッセ中央バス停 下車すぐ" },
                { icon: "🚗", label: "車",         body: "幕張メッセ第1〜3駐車場（有料）" },
              ].map((a) => (
                <div key={a.label} className="flex gap-3">
                  <span className="text-xl leading-none">{a.icon}</span>
                  <div>
                    <p className="font-bold text-gray-700">{a.label}</p>
                    <p className="text-gray-500">{a.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="https://www.m-messe.co.jp/access/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1 text-[12px] text-sky-600 hover:underline"
            >
              幕張メッセ 公式アクセスページ <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden px-6 py-16 text-white sm:px-12 sm:py-20"
        style={{ background: "linear-gradient(160deg, #030e28 0%, #06174a 100%)" }}
      >
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0"
          style={{ height: "60px", background: "white", clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        <div className="relative z-10 mx-auto max-w-5xl pt-4">
          <h2 className="mb-2 text-2xl font-black tracking-tight sm:text-3xl">お問い合わせ</h2>
          <p className="mb-8 text-[14px] text-white/60">
            取材・協賛・登壇ご依頼はお気軽にどうぞ。
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:info@edu-match.com"
              className="inline-flex items-center gap-2 rounded border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
            >
              <Mail className="h-4 w-4" /> info@edu-match.com
            </a>
            <a
              href="https://edu-match.com/contact"
              className="inline-flex items-center gap-2 rounded bg-white px-5 py-2.5 text-sm font-bold text-[#06174a] transition-opacity hover:opacity-90"
            >
              お問い合わせフォーム <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 text-center" style={{ background: "#020b20" }}>
        <p className="text-xs font-semibold text-white/70">教育AIサミット × Interop Tokyo 2026</p>
        <p className="mt-1 text-[11px] text-white/40">青楓館高等学院 / みんがく（EduMatch） / AI検定協会 / AI部</p>
        <p className="mt-4 text-[10px] text-white/25">© 2026 EduMatch / みんがく</p>
      </footer>
    </main>
  );
}
