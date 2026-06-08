import type { Metadata } from "next";
import { MapPin, CalendarDays, Building2, Mail, ExternalLink, ChevronRight, Mic2 } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

export const metadata: Metadata = {
  title: "Education × AI ゾーン | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 Education × AI ゾーン。議員会館・AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報。会場：幕張メッセ。",
};

const SESSIONS = [
  {
    day: "Day 1",
    time: "11:00–11:50",
    title: "生成AIが変える教育格差——現場と政策の最前線",
    speaker: "議員会館AI研究会",
    kind: "keynote" as const,
    room: "Room G / 7A08",
  },
  {
    day: "Day 1",
    time: "14:00–14:40",
    title: "AI検定が拓く、学びのパスポート",
    speaker: "AI検定協会",
    kind: "seminar" as const,
    room: "ブース 8A14",
  },
  {
    day: "Day 2",
    time: "10:30–11:10",
    title: "エデュマッチ——AIが繋ぐ生徒・学校・保護者",
    speaker: "みんがく / EduMatch",
    kind: "demo" as const,
    room: "ブース 8A14",
  },
  {
    day: "Day 2",
    time: "13:00–13:40",
    title: "高校生がつくるAI部活の可能性",
    speaker: "青楓館高等学院 AI部",
    kind: "seminar" as const,
    room: "Room G / 7A08",
  },
  {
    day: "Day 3",
    time: "11:00–12:00",
    title: "Education×AI 総括セッション＋パネルディスカッション",
    speaker: "全登壇者",
    kind: "keynote" as const,
    room: "Room G / 7A08",
  },
];

const KIND_STYLES = {
  keynote: { label: "基調講演", bg: "bg-[#1a3a8f]", text: "text-white" },
  seminar: { label: "セミナー", bg: "bg-[#5a2d8f]", text: "text-white" },
  demo:    { label: "デモ展示", bg: "bg-[#8f5a00]", text: "text-white" },
};

const EXHIBITORS = [
  { name: "青楓館高等学院", en: "Seihouukan High School", tag: "通信制高校" },
  { name: "みんがく", en: "MingaKu / EduMatch", tag: "EdTech" },
  { name: "AI検定協会", en: "AI Kentei Association", tag: "資格・検定" },
  { name: "議員会館AI研究会", en: "Diet Members' AI Study Group", tag: "政策" },
  { name: "AI部", en: "AI Club", tag: "学生団体" },
  { name: "インタロップ事務局", en: "Interop Tokyo", tag: "主催共同体" },
];

export default function InteropPage() {
  return (
    <main className="min-h-screen text-gray-900">

      {/* ══════════════════════════════════════════
          HERO — dark navy gradient（参照ページのバナーに対応）
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden px-4 pb-12 pt-10 text-white sm:pb-16 sm:pt-14"
        style={{ background: "linear-gradient(150deg, #050f28 0%, #0c1f5e 50%, #1a3898 85%, #2b50c0 100%)" }}
      >
        {/* 細いトップライン */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500" />

        <div className="mx-auto max-w-5xl">
          {/* ロゴ行 */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="rounded border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              Interop Tokyo 2026
            </span>
            <span className="text-white/40">×</span>
            <span className="rounded border border-cyan-400/50 bg-cyan-500/15 px-3 py-1 text-[11px] font-bold text-cyan-200">
              Education AI
            </span>
          </div>

          {/* メインタイトル */}
          <h1 className="text-[40px] font-black leading-none tracking-tight sm:text-[72px]">
            Education
            <br />
            <span className="text-cyan-300">×&thinsp;AI</span>
            <span className="ml-3 text-[28px] font-bold text-white/70 sm:text-[40px]">ゾーン</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-base">
            生成AIで変わる教育の未来を体感せよ。
            <br />
            現場・政策・産業が一堂に会し、教育×AIの「今」と「これから」を語り合う場です。
          </p>

          {/* 開催情報バッジ */}
          <div className="mt-7 flex flex-wrap gap-3 text-sm">
            {[
              { icon: <CalendarDays className="h-4 w-4" />, text: "2026年6月10日（水）〜12日（金）" },
              { icon: <Building2 className="h-4 w-4" />, text: "幕張メッセ" },
              { icon: <MapPin className="h-4 w-4" />, text: "ブース 8A14" },
            ].map((b) => (
              <span key={b.text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 font-medium text-white/85 ring-1 ring-white/20">
                {b.icon} {b.text}
              </span>
            ))}
          </div>

          {/* CTAリンク */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#program"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#0c1f5e] transition-opacity hover:opacity-90"
            >
              プログラムを見る <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="#map"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              案内マップへ
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHITE CONTENT AREA（参照ページの本文エリアに対応）
      ══════════════════════════════════════════ */}
      <div className="bg-white">

        {/* ── 開催趣旨 ──────────────────────────────── */}
        <section className="border-b border-gray-100 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 inline-flex items-center gap-2 rounded bg-[#0c1f5e] px-4 py-1.5 text-sm font-bold text-white">
              開催趣旨
            </h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-3">
              {[
                {
                  title: "キッカケ格差をなくす",
                  body: "生成AIの恩恵を受けられる学生・教員が偏っている現状を打破。正しい理解と実践の機会を広く提供します。",
                },
                {
                  title: "現場・政策・産業を繋ぐ",
                  body: "高校生・大学生・教員・議員・企業が一堂に会し、教育×AIの未来を共創します。",
                },
                {
                  title: "体験型の展示・登壇",
                  body: "講演だけでなく、ブース展示・ライブデモ・AI検定体験など、来場者が直接触れる機会を用意しています。",
                },
              ].map((c) => (
                <div key={c.title} className="border-l-4 border-[#0c1f5e] pl-4">
                  <h3 className="font-bold text-gray-900">{c.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 基調講演・登壇者 ──────────────────────── */}
        <section className="border-b border-gray-100 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 inline-flex items-center gap-2 rounded bg-[#0c1f5e] px-4 py-1.5 text-sm font-bold text-white">
              登壇者
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  name: "議員会館AI研究会",
                  role: "政策・立法",
                  topic: "生成AIが変える教育格差——現場と政策の最前線",
                  day: "Day 1",
                },
                {
                  name: "AI検定協会",
                  role: "資格・検定",
                  topic: "AI検定が拓く、学びのパスポート",
                  day: "Day 1",
                },
                {
                  name: "みんがく / EduMatch",
                  role: "EdTech",
                  topic: "エデュマッチ——AIが繋ぐ生徒・学校・保護者",
                  day: "Day 2",
                },
                {
                  name: "青楓館高等学院 AI部",
                  role: "学生団体",
                  topic: "高校生がつくるAI部活の可能性",
                  day: "Day 2",
                },
              ].map((s) => (
                <div key={s.name} className="flex gap-4 rounded-lg border border-gray-200 p-4">
                  {/* アバター */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0c1f5e] to-[#2b50c0] text-xs font-bold text-white">
                    {s.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                    <p className="text-[11px] text-gray-500">{s.role} · {s.day}</p>
                    <p className="mt-1.5 text-[13px] leading-snug text-gray-700">「{s.topic}」</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 展示会場内セミナー ────────────────────── */}
        <section id="program" className="border-b border-gray-100 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 inline-flex items-center gap-2 rounded bg-[#0c1f5e] px-4 py-1.5 text-sm font-bold text-white">
              展示会場内セミナー
            </h2>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
              {SESSIONS.map((s) => (
                <div key={s.title} className="flex flex-col gap-1.5 px-4 py-4 sm:flex-row sm:items-start sm:gap-4">
                  {/* 日時 */}
                  <div className="shrink-0 sm:w-36">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase">{s.day}</p>
                    <p className="font-mono text-sm font-bold text-gray-700">{s.time}</p>
                    <p className="text-[11px] text-gray-400">{s.room}</p>
                  </div>
                  {/* バッジ */}
                  <div className="shrink-0 pt-px">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${KIND_STYLES[s.kind].bg} ${KIND_STYLES[s.kind].text}`}>
                      {KIND_STYLES[s.kind].label}
                    </span>
                  </div>
                  {/* 内容 */}
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 leading-snug">{s.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-gray-500">
                      <Mic2 className="h-3 w-3" aria-hidden /> {s.speaker}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-400">
              ※ タイムテーブルの詳細・最新情報はインフォメーション・マップからご確認ください。内容は変更になる場合があります。
            </p>
          </div>
        </section>

        {/* ── 展示マップ＋インフォメーション ───────── */}
        <section id="map" className="border-b border-gray-100 bg-gray-50 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 inline-flex items-center gap-2 rounded bg-[#0c1f5e] px-4 py-1.5 text-sm font-bold text-white">
              展示マップ・ブース内セミナー
            </h2>
            <p className="mt-1 mb-6 text-[13px] text-gray-500">
              カテゴリを選択してサブカテゴリ・案内記事へ。中央の「インフォメーション」から全ての案内に辿り着けます。
            </p>

            {/* ブースレイアウト図（シンプルなSVG/CSS図） */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">幕張メッセ — Education×AI ゾーン</p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold sm:grid-cols-6">
                {[
                  { label: "議員会館AI\n研究会", color: "bg-violet-100 text-violet-800 border-violet-200" },
                  { label: "AI検定\n協会", color: "bg-blue-100 text-blue-800 border-blue-200" },
                  { label: "インフォ\nメーション", color: "bg-[#0c1f5e] text-white border-[#0c1f5e]", main: true },
                  { label: "エデュ\nマッチ", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
                  { label: "AI部", color: "bg-green-100 text-green-800 border-green-200" },
                  { label: "インタロップ\n事務局", color: "bg-orange-100 text-orange-800 border-orange-200" },
                ].map((b) => (
                  <div
                    key={b.label}
                    className={`rounded border py-3 px-2 leading-tight whitespace-pre-line ${b.color} ${b.main ? "ring-2 ring-offset-1 ring-[#0c1f5e]" : ""}`}
                  >
                    {b.label}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-right text-[10px] text-gray-400">すべて 8A14 ブース内（予定）</p>
            </div>

            {/* バブルマップ */}
            <InteropExplorer />
          </div>
        </section>

        {/* ── 参加企業・団体 ───────────────────────── */}
        <section className="border-b border-gray-100 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 inline-flex items-center gap-2 rounded bg-[#0c1f5e] px-4 py-1.5 text-sm font-bold text-white">
              参加企業・団体
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {EXHIBITORS.map((ex) => (
                <div key={ex.name} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-5 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0c1f5e] to-[#2b50c0] text-sm font-black text-white">
                    {ex.name[0]}
                  </div>
                  <p className="text-[12px] font-bold leading-tight text-gray-900">{ex.name}</p>
                  <p className="text-[10px] text-gray-400">{ex.tag}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 開催概要 ─────────────────────────────── */}
        <section className="border-b border-gray-100 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 inline-flex items-center gap-2 rounded bg-[#0c1f5e] px-4 py-1.5 text-sm font-bold text-white">
              開催概要
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["名称", "Interop Tokyo 2026 Education×AI ゾーン"],
                    ["会期", "2026年6月10日（水）〜12日（金）"],
                    ["時間", "10:00–17:00（最終日 〜16:30）"],
                    ["会場", "幕張メッセ（千葉市美浜区）"],
                    ["ブース", "8A14（Education×AI ゾーン）"],
                    ["入場", "Interop Tokyo 2026 来場登録（無料）"],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="py-2.5 pr-4 font-semibold text-gray-500 align-top w-20">{label}</td>
                      <td className="py-2.5 text-gray-800 leading-snug">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div>
                <h3 className="mb-3 font-bold text-gray-800">アクセス</h3>
                <div className="space-y-3 text-[13px]">
                  {[
                    { icon: "🚃", label: "JR・京葉線", body: "海浜幕張駅 南口より徒歩約5分" },
                    { icon: "🚍", label: "バス", body: "幕張メッセ中央バス停 下車すぐ" },
                    { icon: "🚗", label: "車", body: "幕張メッセ第1〜3駐車場（有料）" },
                  ].map((a) => (
                    <div key={a.label} className="flex gap-3">
                      <span className="text-base leading-none mt-0.5" aria-hidden>{a.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-700">{a.label}</p>
                        <p className="text-gray-500">{a.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <a
                  href="https://www.m-messe.co.jp/access/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-[12px] text-blue-600 hover:underline"
                >
                  幕張メッセ 公式アクセスページ <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── お問い合わせ ──────────────────────────── */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 inline-flex items-center gap-2 rounded bg-[#0c1f5e] px-4 py-1.5 text-sm font-bold text-white">
              お問い合わせ
            </h2>
            <p className="mt-3 text-[14px] text-gray-600">
              取材・メディア掲載・協賛・登壇のご依頼はお気軽にどうぞ。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="mailto:info@edu-match.com"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Mail className="h-4 w-4" /> info@edu-match.com
              </a>
              <a
                href="https://edu-match.com/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0c1f5e] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0e2878] transition-colors"
              >
                お問い合わせフォーム <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════
          FOOTER — dark navy（参照ページのフッターに対応）
      ══════════════════════════════════════════ */}
      <footer
        className="px-4 py-10 text-center text-white/70"
        style={{ background: "linear-gradient(160deg, #050f28 0%, #0c1f5e 100%)" }}
      >
        <p className="text-sm font-semibold text-white">Interop Tokyo 2026 — Education × AI ゾーン</p>
        <p className="mt-1.5 text-[12px] text-white/50">
          主催共同体：青楓館高等学院 / みんがく（EduMatch） / AI検定協会 / AI部
        </p>
        <p className="mt-5 text-[11px] text-white/30">© 2026 EduMatch / みんがく</p>
      </footer>
    </main>
  );
}
