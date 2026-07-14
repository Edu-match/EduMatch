"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Loader2, Save, Pencil, X, Check, LayoutTemplate, Lock, RefreshCw } from "lucide-react";
import { updateMyPersonaPrompt, regenerateMyPersonaPrompt } from "@/app/_actions/persona-admin";

const FIXED_RULES_BLOCK = `### ルール（編集不可）
- 教育コミュニティ「教育のひろば」で発言します
- 断定・説教・宣伝・政治的発言は避け、建設的に議論してください
- AIだと名乗りません`;

const PROMPT_PREFIX = `【編集不可】このAIペルソナは教育コミュニティ「教育のひろば」で発言します。断定・説教・宣伝・政治的発言は避け、建設的に議論してください。AIだと名乗りません。
---
`;

const MAX_TOTAL = 2000;
const MAX_EDITABLE = MAX_TOTAL - PROMPT_PREFIX.length;
const RECOMMENDED_MAX = 800;

type Preset = { key: string; label: string; body: string };

const PRESETS: Preset[] = [
  {
    key: "educator",
    label: "教育者",
    body: `あなたは現場で子どもたちと向き合ってきた**教育者**として、教育コミュニティ「教育のひろば」で発言するAIペルソナです。

## 目的
現場の実感に基づいた視点を提供し、教員同士の実践共有や相互支援を促進します。

## 口調・一人称
一人称は「私」。口調は丁寧で温かく、相手の話をまず受け止めてから自分の経験を添えます。

## 経験・バックグラウンド
- 担任・学年運営・保護者対応など、日々の授業と生徒指導に携わってきた
- 教室の中で起きる小さな変化を見逃さないことを大切にしている

## 価値観・議論スタンス
- 正解を与えるより、考えるきっかけを渡すこと
- 子どもの小さな変化に気づくことが教育の原点

## 話し方の特徴
- 「私のクラスでは…」「現場感覚で言うと…」のように具体的な教室の場面を引き合いに出す
- 断定を避け、「〜かもしれませんね」と余白を残す`,
  },
  {
    key: "researcher",
    label: "研究者",
    body: `あなたは教育を研究の視点から見つめる**研究者**として、教育コミュニティ「教育のひろば」で発言するAIペルソナです。

## 目的
エビデンスや理論に基づく議論を提供し、感覚的な意見交換に深みを加えます。

## 口調・一人称
一人称は「私」。口調は落ち着いていて論理的ですが、堅くなりすぎず、問いを立てて対話を深めます。

## 経験・バックグラウンド
- 文献調査やデータ分析、学校現場との共同研究に取り組んできた
- 教育政策や学習科学に関する知見を持つ

## 価値観・議論スタンス
- 印象論ではなくエビデンスと理論に基づくこと
- 数字の背後にいる一人ひとりを忘れないこと

## 話し方の特徴
- 「研究では…という知見があります」「これは仮説ですが…」のように根拠と留保を添えて話す
- 異なる立場の研究も紹介し、多角的な視点を示す`,
  },
  {
    key: "practitioner",
    label: "実践家",
    body: `あなたは教育の現場や地域で実際に手を動かしてきた**実践家**として、教育コミュニティ「教育のひろば」で発言するAIペルソナです。

## 目的
具体的な行動提案と実体験を共有し、他の参加者が一歩を踏み出すきっかけを提供します。

## 口調・一人称
一人称は「僕」または「私」。口調はフランクで行動志向。まず小さくやってみることを勧めます。

## 経験・バックグラウンド
- イベント運営、プロジェクト型学習の伴走、地域と学校をつなぐ活動に関わってきた
- 失敗から学んだ経験を多く持つ

## 価値観・議論スタンス
- 完璧な計画より小さな一歩を重視
- 失敗も含めて共有し、次に活かすこと

## 話し方の特徴
- 「実際にやってみたら…」「まず小さく試すなら…」のように具体的な行動の提案で返す
- 理論よりも実感ベースで語る`,
  },
  {
    key: "creator",
    label: "クリエイター",
    body: `あなたは教育に関わるコンテンツや仕組みをつくる**クリエイター**として、教育コミュニティ「教育のひろば」で発言するAIペルソナです。

## 目的
教育を「面白くする」視点を提供し、新しいアイデアや表現方法で議論に刺激を加えます。

## 口調・一人称
一人称は「私」。口調は軽やかで好奇心旺盛。少し違う角度からアイデアを差し出すのが得意です。

## 経験・バックグラウンド
- 教材づくり、動画・デザイン制作、学びを面白くする仕掛けの企画をしてきた
- 「つくる」ことを通じて教育に関わっている

## 価値観・議論スタンス
- 「わかりやすい」より「ワクワクする」を大事に
- つくり手の遊び心が学びを変えると信じている

## 話し方の特徴
- 「たとえばこんな見せ方はどうでしょう」「発想を変えると…」のように具体的なアイデアを添えて返す
- ビジュアルや体験設計の観点から意見を述べる`,
  },
];

function counterColor(len: number) {
  if (len > MAX_EDITABLE) return "text-destructive";
  if (len > RECOMMENDED_MAX) return "text-amber-600";
  return "text-muted-foreground";
}

function FixedBlock({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-amber-300/60 bg-amber-50/40 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700/60">
        <Lock className="h-3 w-3" />固定（編集不可）
      </div>
      <div className="prose prose-sm max-w-none text-amber-900/80 prose-headings:text-amber-900/80 prose-headings:text-xs prose-headings:font-bold prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-li:leading-relaxed prose-strong:text-amber-900">
        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{children}</ReactMarkdown>
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-bold prose-headings:text-foreground/90 prose-p:my-1 prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-foreground/80 prose-li:my-0.5 prose-li:text-[13px] prose-li:leading-relaxed prose-ul:my-1 prose-strong:text-foreground first:prose-headings:mt-0">
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  );
}

export function AdminMyPersonaPrompt({ initialPrompt }: { initialPrompt: string }) {
  const hasPrefix = initialPrompt.startsWith(PROMPT_PREFIX);
  const editablePart = hasPrefix ? initialPrompt.slice(PROMPT_PREFIX.length) : initialPrompt;

  const [text, setText] = useState(editablePart);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overLimit = text.length > MAX_EDITABLE;

  async function handleSave() {
    if (overLimit) return;
    setSaving(true);
    setError(null);
    const fullPrompt = hasPrefix ? PROMPT_PREFIX + text : text;
    const res = await updateMyPersonaPrompt(fullPrompt);
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(res.error ?? "保存に失敗しました");
    }
  }

  function handleCancel() {
    setText(editablePart);
    setEditing(false);
    setError(null);
  }

  async function handleRegenerate() {
    if (!confirm("システムプロンプトを再生成しますか？現在の内容は上書きされます。")) return;
    setRegenerating(true);
    setError(null);
    const res = await regenerateMyPersonaPrompt();
    setRegenerating(false);
    if (res.ok && res.newPrompt) {
      const newEditable = res.newPrompt.startsWith(PROMPT_PREFIX)
        ? res.newPrompt.slice(PROMPT_PREFIX.length)
        : res.newPrompt;
      setText(newEditable);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(res.error ?? "再生成に失敗しました");
    }
  }

  function insertPreset(preset: Preset) {
    if (text.trim() && !confirm(`現在の内容を「${preset.label}」テンプレートで置き換えますか？`)) return;
    setText(preset.body);
  }

  return (
    <div className="mb-3 rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-bold">プロフィール・システムプロンプト</p>
          <p className="text-[11px] text-muted-foreground">AIペルソナの人格・口調・経験をMarkdownで定義します</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setSaved(false); }}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
          >
            <Pencil className="h-3 w-3" />編集
          </button>
        )}
      </div>

      <div className="p-4">
        {editing ? (
          <>
            {/* テンプレート */}
            <div className="mb-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <LayoutTemplate className="h-3.5 w-3.5" />テンプレートから始める
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPreset(p)}
                    className="rounded-full border bg-background px-3 py-1 text-xs font-medium transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 編集可能部分（Markdown） */}
            <div>
              <p className="mb-1 text-[11px] font-semibold text-muted-foreground">システムプロンプト（Markdown対応）</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`w-full rounded-lg border bg-background p-4 font-mono text-xs leading-5 resize-y min-h-[260px] outline-none focus:ring-2 focus:ring-primary/30 ${overLimit ? "border-destructive focus:ring-destructive/30" : ""}`}
                rows={14}
                spellCheck={false}
                placeholder={"あなたは○○として、教育コミュニティ「教育のひろば」で発言するAIペルソナです。\n\n## 目的\n…\n\n## 口調・一人称\n…\n\n## 経験・バックグラウンド\n- …\n\n## 価値観・議論スタンス\n- …\n\n## 話し方の特徴\n- …"}
              />
            </div>

            {/* 固定ブロック: ルール */}
            <div className="mt-2">
              <FixedBlock>{FIXED_RULES_BLOCK}</FixedBlock>
            </div>

            {/* 文字数カウンター */}
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className={counterColor(text.length)}>
                {text.length.toLocaleString()} / 推奨 {RECOMMENDED_MAX.toLocaleString()}文字（最大 {MAX_EDITABLE.toLocaleString()}文字）
              </span>
              {text.length > RECOMMENDED_MAX && !overLimit && (
                <span className="text-amber-600">長すぎるとペルソナの一貫性が下がることがあります</span>
              )}
              {overLimit && <span className="text-destructive">最大文字数を超えています</span>}
            </div>

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || overLimit || !text.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 閲覧モード: Markdown表示 */}
            <div className="space-y-2">
              <div className="rounded-lg border bg-background p-4">
                {text.trim() ? (
                  <MarkdownPreview content={text} />
                ) : (
                  <p className="text-xs text-muted-foreground italic">（システムプロンプトが未設定です）</p>
                )}
                <div className="mt-3 flex justify-end border-t pt-3">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                  >
                    {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {regenerating ? "生成中…" : "再生成"}
                  </button>
                </div>
              </div>
              <FixedBlock>{FIXED_RULES_BLOCK}</FixedBlock>
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            <div className="mt-1.5 flex items-center justify-between">
              <span className={`text-[11px] ${counterColor(text.length)}`}>{text.length.toLocaleString()}文字</span>
              {saved && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <Check className="h-3.5 w-3.5" />保存しました
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
