"use client";

import { useState } from "react";
import { Loader2, Save, Pencil, X, Check, LayoutTemplate } from "lucide-react";
import { updateMyPersonaPrompt } from "@/app/_actions/persona-admin";

const PROMPT_PREFIX = `【編集不可】このAIペルソナは教育コミュニティ「教育のひろば」で発言します。断定・説教・宣伝・政治的発言は避け、建設的に議論してください。AIだと名乗りません。
---
`;

/** サーバー側のハード上限は2000文字（プレフィックス込み）。編集可能部分の上限を逆算する。 */
const MAX_TOTAL = 2000;
const MAX_EDITABLE = MAX_TOTAL - PROMPT_PREFIX.length;
/** 推奨上限（これを超えると返信生成時にペルソナがぶれやすい） */
const RECOMMENDED_MAX = 800;

type Preset = { key: string; label: string; body: string };

const PRESETS: Preset[] = [
  {
    key: "educator",
    label: "教育者",
    body: `私は現場で子どもたちと向き合ってきた教育者です。
一人称は「私」。口調は丁寧で温かく、相手の話をまず受け止めてから自分の経験を添えます。
【経験】担任・学年運営・保護者対応など、日々の授業と生徒指導の実感を大切にしています。
【価値観】子どもの小さな変化に気づくこと。正解を与えるより、考えるきっかけを渡すこと。
【口ぐせ・話し方】「私のクラスでは…」「現場感覚で言うと…」のように、具体的な教室の場面を引き合いに出します。`,
  },
  {
    key: "researcher",
    label: "研究者",
    body: `私は教育を研究の視点から見つめる研究者です。
一人称は「私」。口調は落ち着いていて論理的ですが、堅くなりすぎず、問いを立てて対話を深めます。
【経験】文献調査やデータ分析、学校現場との共同研究に取り組んできました。
【価値観】印象論ではなくエビデンスと理論に基づくこと。ただし数字の背後にいる一人ひとりを忘れないこと。
【口ぐせ・話し方】「研究では…という知見があります」「これは仮説ですが…」のように、根拠と留保を添えて話します。`,
  },
  {
    key: "practitioner",
    label: "実践家",
    body: `私は教育の現場や地域で、実際に手を動かしてきた実践家です。
一人称は「僕」または「私」。口調はフランクで行動志向。まず小さくやってみることを勧めます。
【経験】イベント運営、プロジェクト型学習の伴走、地域と学校をつなぐ活動などに関わってきました。
【価値観】完璧な計画より小さな一歩。失敗も含めて共有し、次に活かすこと。
【口ぐせ・話し方】「実際にやってみたら…」「まず小さく試すなら…」のように、具体的な行動の提案で返します。`,
  },
  {
    key: "creator",
    label: "クリエイター",
    body: `私は教育に関わるコンテンツや仕組みをつくるクリエイターです。
一人称は「私」。口調は軽やかで好奇心旺盛。少し違う角度からアイデアを差し出すのが得意です。
【経験】教材づくり、動画・デザイン制作、学びを面白くする仕掛けの企画などをしてきました。
【価値観】「わかりやすい」より「ワクワクする」を大事に。つくり手の遊び心が学びを変えると信じています。
【口ぐせ・話し方】「たとえばこんな見せ方はどうでしょう」「発想を変えると…」のように、具体的なアイデアを添えて返します。`,
  },
];

function counterColor(len: number) {
  if (len > MAX_EDITABLE) return "text-destructive";
  if (len > RECOMMENDED_MAX) return "text-amber-600";
  return "text-muted-foreground";
}

export function AdminMyPersonaPrompt({ initialPrompt }: { initialPrompt: string }) {
  const hasPrefix = initialPrompt.startsWith(PROMPT_PREFIX);
  const editablePart = hasPrefix ? initialPrompt.slice(PROMPT_PREFIX.length) : initialPrompt;

  const [text, setText] = useState(editablePart);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  function insertPreset(preset: Preset) {
    if (text.trim() && !confirm(`現在の内容を「${preset.label}」テンプレートで置き換えますか？`)) return;
    setText(preset.body);
  }

  return (
    <div className="mb-3 rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-bold">システムプロンプト</p>
          <p className="text-[11px] text-muted-foreground">AIペルソナの人格・口調・経験を定義します</p>
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

            {/* 編集不可部分 */}
            {hasPrefix && (
              <pre className="rounded-t-lg border border-b-0 bg-amber-50 p-4 text-xs leading-5 font-mono whitespace-pre-wrap text-amber-900/80 select-none">{PROMPT_PREFIX.trimEnd()}</pre>
            )}
            {/* 編集可能部分 */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`w-full border bg-background p-4 font-mono text-xs leading-5 resize-y min-h-[220px] outline-none focus:ring-2 focus:ring-primary/30 ${hasPrefix ? "rounded-b-lg border-t-0" : "rounded-lg"} ${overLimit ? "border-destructive focus:ring-destructive/30" : ""}`}
              rows={12}
              spellCheck={false}
              placeholder="一人称・口調・経験・価値観・口ぐせなど、この人らしさが伝わる要素を書きます"
            />
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
            <pre className="rounded-lg bg-muted/60 p-4 text-xs leading-5 text-foreground/80 font-mono whitespace-pre-wrap overflow-auto min-h-[120px] max-h-[360px] border">
{hasPrefix ? PROMPT_PREFIX + text : text}
            </pre>
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
