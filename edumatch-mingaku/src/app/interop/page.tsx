import type { Metadata } from "next";
import { MapPin, CalendarDays, Building2, Mail, Users, MonitorPlay, Presentation, Award, ExternalLink, ChevronRight, Mic2, LayoutGrid } from "lucide-react";
import { InteropExplorer } from "@/components/interop/interop-explorer";

export const metadata: Metadata = {
  title: "Education × AI ゾーン | Interop Tokyo 2026",
  description:
    "Interop Tokyo 2026 Education × AI ゾーン。議員会館・AI検定・エデュマッチ・AI部の展示・登壇・セミナー情報をまとめています。会場：幕張メッセ。",
};

// ─── データ定数 ────────────────────────────────────────────────
const EVENT = {
  dates: "2026年6月10日（水）〜12日（金）",
  venue: "幕張メッセ",
  booth: "8A14",
  hours: "10:00 – 17:00（最終日 〜16:30）",
};

const STATS = [
  { value: "6+", label: "展示・出展団体" },
  { value: "3日間", label: "開催期間" },
  { value: "8A14", label: "ブース番号" },
  { value: "Education×AI", label: "ゾーン" },
];

const EXHIBITORS = [
  { name: "青楓館高等学院", ruby: "SEIHOUUKAN", booth: "8A14", tag: "学校法人" },
  { name: "みんがく", ruby: "MingaKu / EduMatch", booth: "8A14", tag: "EdTech" },
  { name: "AI検定協会", ruby: "AI Kentei", booth: "8A14", tag: "資格・検定" },
  { name: "議員会館AI研究会", ruby: "GIIN KAIKAN", booth: "別途", tag: "政策" },
  { name: "AI部", ruby: "AI CLUB", booth: "8A14", tag: "学生" },
  { name: "インタロップ運営事務局", ruby: "INTEROP", booth: "Main", tag: "主催" },
];

const SESSIONS: { time: string; title: string; speaker: string; kind: "keynote" | "seminar" | "demo" }[] = [
  { time: "Day 1  11:00", title: "生成AIが変える教育格差——現場と政策の最前線", speaker: "議員会館AI研究会", kind: "keynote" },
  { time: "Day 1  14:00", title: "AI検定が拓く、学びのパスポート", speaker: "AI検定協会", kind: "seminar" },
  { time: "Day 2  10:30", title: "エデュマッチ——AIが繋ぐ生徒・学校・保護者", speaker: "みんがく / EduMatch", kind: "demo" },
  { time: "Day 2  13:00", title: "高校生がつくるAI部活の可能性", speaker: "青楓館高等学院 AI部", kind: "seminar" },
  { time: "Day 3  11:00", title: "Education×AI 総括セッション＋パネルディスカッション", speaker: "全登壇者", kind: "keynote" },
];

const SESSION_COLOR: Record<string, string> = {
  keynote: "bg-cyan-400/20 text-cyan-200 border-cyan-400/30",
  seminar: "bg-violet-400/20 text-violet-200 border-violet-400/30",
  demo: "bg-amber-400/20 text-amber-200 border-amber-400/30",
};
const SESSION_LABEL: Record<string, string> = {
  keynote: "基調講演",
  seminar: "セミナー",
  demo: "デモ展示",
};

const ACCESS_STEPS = [
  { icon: "🚃", heading: "JR・京葉線", body: "海浜幕張駅から徒歩約5分" },
  { icon: "🚍", heading: "バス", body: "幕張メッセ中央バス停下車すぐ" },
  { icon: "🚗", heading: "車", body: "幕張メッセ第1〜3駐車場（有料）。混雑時は公共交通機関を推奨" },
];

// ─── 補助コンポーネント ─────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">{children}</p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{children}</h2>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── ページ本体 ────────────────────────────────────────────────
export default function InteropPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">

      {/* ── 背景 ─────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 -z-20"
        style={{ background: "linear-gradient(160deg, #06112e 0%, #0d2260 40%, #1a449c 75%, #2355b8 100%)" }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 45% at 50% 0%, rgba(100,160,255,0.22) 0%, transparent 60%), radial-gradient(50% 40% at 85% 15%, rgba(140,90,255,0.14) 0%, transparent 55%)",
        }}
      />
      {/* グリッド装飾 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* アクセントライン */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />

        <div className="container px-4 pb-10 pt-10 sm:pt-16">
          {/* バッジ群 */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-500/12 px-3 py-1 text-[11px] font-bold tracking-wide text-cyan-200">
              <CalendarDays className="h-3 w-3" aria-hidden /> {EVENT.dates}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[11px] font-bold tracking-wide text-white/85">
              <Building2 className="h-3 w-3" aria-hidden /> {EVENT.venue}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-500/12 px-3 py-1 text-[11px] font-bold tracking-wide text-violet-200">
              <MapPin className="h-3 w-3" aria-hidden /> ブース {EVENT.booth}
            </span>
          </div>

          {/* タイトル */}
          <div className="mt-6 text-center">
            <div className="inline-block">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/50">Interop Tokyo 2026</p>
              <h1 className="mt-2 text-balance text-[32px] font-extrabold leading-[1.15] tracking-tight sm:text-6xl">
                <span className="bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-transparent">
                  Education
                </span>
                <span className="text-white/60 mx-2 sm:mx-3">×</span>
                <span className="bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200 bg-clip-text text-transparent">
                  AI ゾーン
                </span>
              </h1>
            </div>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-white/75 sm:text-base">
              生成AIが急速に普及する一方、教育現場での活用には大きな格差が生まれています。
              <br className="hidden sm:block" />
              Interop Tokyo 2026 の Education×AI ゾーンは、その「キッカケ格差」をなくすための場です。
            </p>
          </div>

          {/* CTAボタン */}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="#program"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/40 transition-opacity hover:opacity-90"
            >
              プログラムを見る <ChevronRight className="h-4 w-4" aria-hidden />
            </a>
            <a
              href="#info-map"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/14"
            >
              インフォメーション・マップ <MapPin className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS バー
      ══════════════════════════════════════════════ */}
      <section className="border-y border-white/10 bg-white/4 py-5 backdrop-blur">
        <div className="container px-4">
          <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-[11px] font-medium text-white/55">{s.label}</dt>
                <dd className="mt-0.5 text-2xl font-extrabold tracking-tight text-cyan-100 sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          開催趣旨
      ══════════════════════════════════════════════ */}
      <section className="container px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <SectionLabel>About</SectionLabel>
            <SectionHeading>開催趣旨</SectionHeading>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: <Award className="h-5 w-5" />,
                title: "キッカケ格差をなくす",
                body: "生成AIの恩恵を受けられる学生・教員が偏っている現状を打破。正しい理解と実践の機会を広く提供します。",
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: "現場・政策・産業をつなぐ",
                body: "高校生・大学生・教員・議員・企業が一堂に会し、教育×AIの未来を共創します。",
              },
              {
                icon: <MonitorPlay className="h-5 w-5" />,
                title: "体験型の展示・登壇",
                body: "講演だけでなく、ブース展示・ライブデモ・検定体験など、来場者が直接触れる機会を用意しています。",
              },
            ].map((item) => (
              <GlassCard key={item.title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-200">
                  {item.icon}
                </span>
                <h3 className="mt-3 text-base font-bold">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/72">{item.body}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          インフォメーション・マップ
      ══════════════════════════════════════════════ */}
      <section id="info-map" className="border-t border-white/8 py-14">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 text-center">
              <SectionLabel>Information Map</SectionLabel>
              <SectionHeading>インフォメーション・マップ</SectionHeading>
              <p className="mt-2 text-[13px] text-white/65">
                中央の「インフォメーション」をタップ → カテゴリを選択 → サブカテゴリ・案内記事へ
              </p>
            </div>
            <InteropExplorer />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          プログラム
      ══════════════════════════════════════════════ */}
      <section id="program" className="border-t border-white/8 py-14">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <SectionLabel>Program</SectionLabel>
              <SectionHeading>プログラム</SectionHeading>
            </div>

            {/* 凡例 */}
            <div className="mb-5 flex flex-wrap gap-3">
              {Object.entries(SESSION_LABEL).map(([key, label]) => (
                <span key={key} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${SESSION_COLOR[key]}`}>
                  {label}
                </span>
              ))}
            </div>

            {/* セッションリスト */}
            <div className="space-y-3">
              {SESSIONS.map((s) => (
                <GlassCard key={s.title} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-32 shrink-0 text-[12px] font-mono text-white/55">{s.time}</span>
                  <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${SESSION_COLOR[s.kind]}`}>
                    {SESSION_LABEL[s.kind]}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold leading-snug">{s.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-white/58">
                      <Mic2 className="h-3 w-3" aria-hidden /> {s.speaker}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-white/45">
              ※ タイムテーブル詳細は各カテゴリのインフォメーションマップからご確認ください。内容は変更になる場合があります。
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          出展・登壇者
      ══════════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-14">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <SectionLabel>Exhibitors & Speakers</SectionLabel>
              <SectionHeading>出展・登壇者</SectionHeading>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EXHIBITORS.map((ex) => (
                <GlassCard key={ex.name} className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <LayoutGrid className="h-5 w-5 text-white/60" aria-hidden />
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/65">
                      {ex.tag}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold leading-snug">{ex.name}</h3>
                  <p className="text-[11px] text-white/50">{ex.ruby}</p>
                  <p className="mt-1 text-[11px] text-white/45">ブース: <span className="font-mono text-cyan-300/80">{ex.booth}</span></p>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          展示ゾーン案内
      ══════════════════════════════════════════════ */}
      <section className="border-t border-white/8 bg-white/3 py-14">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <SectionLabel>Exhibition Zone</SectionLabel>
              <SectionHeading>展示ゾーン案内</SectionHeading>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: <Presentation className="h-5 w-5" />,
                  title: "ブース展示（8A14）",
                  items: [
                    "エデュマッチ / みんがくのライブデモ",
                    "AI検定の体験コーナー",
                    "AI部の活動紹介パネル",
                    "青楓館高等学院のプロジェクト発表",
                  ],
                },
                {
                  icon: <MonitorPlay className="h-5 w-5" />,
                  title: "セミナー（Room G・7A08）",
                  items: [
                    "Education×AI 基調講演（Day1・Day3）",
                    "各団体による20〜30分セミナー",
                    "パネルディスカッション（Day3 閉幕前）",
                    "質疑応答・交流タイム",
                  ],
                },
              ].map((zone) => (
                <GlassCard key={zone.title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
                    {zone.icon}
                  </span>
                  <h3 className="mt-3 text-base font-bold">{zone.title}</h3>
                  <ul className="mt-3 space-y-1.5">
                    {zone.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-white/72">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          開催情報
      ══════════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-14">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <SectionLabel>Event Information</SectionLabel>
              <SectionHeading>開催情報</SectionHeading>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {/* 基本情報 */}
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
                  <CalendarDays className="h-4 w-4 text-cyan-300" aria-hidden /> 基本情報
                </h3>
                <dl className="space-y-3">
                  {[
                    { label: "開催日時", value: EVENT.dates },
                    { label: "開催時間", value: EVENT.hours },
                    { label: "会場", value: EVENT.venue + "（千葉市美浜区）" },
                    { label: "ブース", value: `Education×AI ゾーン ${EVENT.booth}` },
                    { label: "入場", value: "Interop Tokyo 2026 来場登録（無料）が必要です" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3">
                      <dt className="w-20 shrink-0 text-[12px] font-semibold text-white/50">{label}</dt>
                      <dd className="text-[13px] leading-snug text-white/85">{value}</dd>
                    </div>
                  ))}
                </dl>
              </GlassCard>

              {/* アクセス */}
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
                  <MapPin className="h-4 w-4 text-cyan-300" aria-hidden /> アクセス
                </h3>
                <div className="space-y-4">
                  {ACCESS_STEPS.map((s) => (
                    <div key={s.heading} className="flex gap-3">
                      <span className="mt-0.5 text-xl leading-none" aria-hidden>{s.icon}</span>
                      <div>
                        <p className="text-[13px] font-semibold">{s.heading}</p>
                        <p className="text-[12px] leading-relaxed text-white/65">{s.body}</p>
                      </div>
                    </div>
                  ))}
                  <a
                    href="https://www.m-messe.co.jp/access/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-cyan-300 underline-offset-2 hover:underline"
                  >
                    幕張メッセ 公式アクセスページ <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          お問い合わせ
      ══════════════════════════════════════════════ */}
      <section className="border-t border-white/8 py-14">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Contact</SectionLabel>
            <SectionHeading>お問い合わせ</SectionHeading>
            <p className="mt-3 text-[14px] leading-relaxed text-white/70">
              取材・メディア掲載・協賛・登壇のご依頼など、お気軽にご連絡ください。
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="mailto:info@edu-match.com"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/14"
              >
                <Mail className="h-4 w-4" aria-hidden /> info@edu-match.com
              </a>
              <a
                href="https://edu-match.com/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/30 transition-opacity hover:opacity-90"
              >
                お問い合わせフォーム <ChevronRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="border-t border-white/10 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-white/80">Interop Tokyo 2026 — Education × AI ゾーン</p>
        <p className="mt-1 text-[12px] text-white/45">主催共同体：青楓館高等学院 / みんがく（EduMatch） / AI検定協会 / AI部</p>
        <p className="mt-4 text-[11px] text-white/30">© 2026 EduMatch / みんがく</p>
      </footer>
    </main>
  );
}
