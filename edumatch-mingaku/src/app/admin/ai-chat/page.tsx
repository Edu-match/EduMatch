"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getSystemPromptOverrides,
  saveSystemPromptOverride,
  deleteSystemPromptOverride,
  type ChatModeKey,
} from "./actions";

// ─── モード定義 ───────────────────────────────────────────────

const MODES: {
  key: ChatModeKey;
  label: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}[] = [
  {
    key: "navigator",
    label: "ナビゲーター",
    sub: "AIチャット（通常）",
    icon: <Bot className="h-4 w-4" />,
    accent: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    key: "debate",
    label: "ディベート",
    sub: "AIチャット（反論モード）",
    icon: <Zap className="h-4 w-4" />,
    accent: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
  },
  {
    key: "discussion",
    label: "ディスカッション",
    sub: "AIチャット（共感モード）",
    icon: <BookOpen className="h-4 w-4" />,
    accent: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
];

// ─── プロンプト編集パネル ─────────────────────────────────────

function PromptPanel({
  modeKey,
  defaultPrompt,
  savedOverride,
  onOverrideChange,
}: {
  modeKey: ChatModeKey;
  defaultPrompt: string;
  savedOverride: string | null;
  onOverrideChange: (mode: ChatModeKey, value: string | null) => void;
}) {
  const mode = MODES.find((m) => m.key === modeKey)!;
  const [text, setText] = useState(savedOverride ?? defaultPrompt);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOverridden = savedOverride !== null;

  useEffect(() => {
    setText(savedOverride ?? defaultPrompt);
  }, [savedOverride, defaultPrompt]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await saveSystemPromptOverride(modeKey, text);
    setSaving(false);
    if (result.ok) {
      setEditing(false);
      setSaved(true);
      onOverrideChange(modeKey, text);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "保存に失敗しました");
    }
  };

  const handleCancel = () => {
    setText(savedOverride ?? defaultPrompt);
    setEditing(false);
    setError(null);
  };

  const handleReset = async () => {
    if (!window.confirm("デフォルトのプロンプトに戻しますか？上書き設定が削除されます。")) return;
    setSaving(true);
    const result = await deleteSystemPromptOverride(modeKey);
    setSaving(false);
    if (result.ok) {
      setText(defaultPrompt);
      onOverrideChange(modeKey, null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "リセットに失敗しました");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`rounded-xl border p-4 mb-4 ${mode.bg}`}>
        <div className={`flex items-center gap-2 font-semibold ${mode.accent}`}>
          {mode.icon}
          {mode.label}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{mode.sub}</p>
        <p className="mt-2 text-[11px] text-muted-foreground leading-4">
          コードのデフォルト: src/app/api/chat/route.ts &gt; SYSTEM_PROMPTS
        </p>
        {isOverridden && (
          <p className="mt-1 text-[11px] font-medium text-amber-700">
            ★ DB上書き中（コードのデフォルトより優先）
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">システムプロンプト</p>
          {!editing && (
            <div className="flex items-center gap-2">
              {isOverridden && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={saving}
                  className="gap-1.5 h-7 text-xs text-muted-foreground"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  リセット
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditing(true); setSaved(false); }}
                className="gap-1.5 h-7 text-xs"
              >
                <Pencil className="h-3 w-3" />編集
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 font-mono text-xs resize-none min-h-[320px]"
              rows={18}
            />
            {error && (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5" disabled={saving}>
                <X className="h-3.5 w-3.5" />キャンセル
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "保存中…" : "保存"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <pre className="flex-1 rounded-lg bg-muted/60 p-4 text-xs leading-5 text-foreground/80 font-mono whitespace-pre-wrap overflow-auto min-h-[320px] border">
              {text}
            </pre>
            {saved && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Check className="h-3.5 w-3.5" />DBに保存しました。次のチャットから反映されます。
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── コードのデフォルトプロンプト（src/app/api/chat/route.ts と同期） ────────

const DEFAULT_PROMPTS: Record<ChatModeKey, string> = {
  navigator: `あなたは教育ICT・EdTechに詳しいAIアシスタントです。このサイト（AIUEO BASE）は教育サービス・教材のマッチングプラットフォームです。

## 回答の仕方
- **ユーザーの質問に自然に答える**：まず質問の内容そのものに答える
- **公的文書参照（RAG）の抜粋が含まれる場合**、「〈文書名〉によれば」を文中に含める
- **サイト内の関連サービス・記事**は回答に自然に織り交ぜる
- **冗長にしない**：原則3〜6文、長くても箇条書き3点まで
- **会話感を重視**：必要なら最後に1つだけ確認質問を返す
- Markdown形式で読みやすく。日本語で丁寧に。`,

  debate: `あなたは「AIUEO BASE」のAIディベートパートナーです。

## 絶対ルール
- ユーザーが示す立場・意見に対して **必ず正反対の立場** をとる（例外なし）
- 回答冒頭で「私は〇〇に反対（賛成）の立場をとります」と宣言する
- 感情論は使わず、**データ・事例・論理**で反論する

## 分量ルール
- 1ターンあたり3〜5文。長くなる場合は箇条書き最大3点。
- 最後に必ず1つだけ問い返しをつける。

Markdown形式。日本語で。`,

  discussion: `あなたは「AIUEO BASE」のAIディスカッションパートナーです。

## スタンス
- まずユーザーの意見・感情を **共感・肯定** してから話を進める
- **問いかけ**を通じて一緒に考える姿勢を保つ
- 多様な視点を提示して思考を広げる

## 分量ルール
- 1ターンあたり3〜5文。
- 共感→視点提示→問い返しの3ステップで完結させる。
- 最後は**必ず問いかけ**で終わる。

Markdown形式。日本語で。`,
};

// ─── メインページ ─────────────────────────────────────────────

export default function AdminAiChatPage() {
  const [selectedMode, setSelectedMode] = useState<ChatModeKey>("navigator");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemPromptOverrides()
      .then((data) => setOverrides(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleOverrideChange(mode: ChatModeKey, value: string | null) {
    setOverrides((prev) => {
      if (value === null) {
        const next = { ...prev };
        delete next[mode];
        return next;
      }
      return { ...prev, [mode]: value };
    });
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background">
        <div className="container max-w-5xl py-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
            <Link href="/provider-dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />ダッシュボード
            </Link>
          </Button>
          <h1 className="text-xl font-bold">AIチャット管理</h1>
          <p className="text-sm text-muted-foreground">各モードのシステムプロンプトをDBに保存・反映します</p>
        </div>
      </div>

      <div className="container max-w-5xl py-6">
        <div className="flex gap-6 items-start">

          <nav className="w-52 shrink-0 space-y-1 sticky top-24">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">AIモード</p>
            {MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setSelectedMode(mode.key)}
                className={[
                  "w-full flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                  selectedMode === mode.key
                    ? "bg-background border shadow-sm"
                    : "hover:bg-background/60",
                ].join(" ")}
              >
                <span className={`mt-0.5 shrink-0 ${selectedMode === mode.key ? mode.accent : "text-muted-foreground"}`}>
                  {mode.icon}
                </span>
                <div>
                  <p className={`text-sm font-medium leading-tight ${selectedMode === mode.key ? mode.accent : ""}`}>
                    {mode.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{mode.sub}</p>
                  {overrides[mode.key] !== undefined && (
                    <p className="text-[10px] text-amber-600 mt-0.5">★ 上書き中</p>
                  )}
                </div>
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-background rounded-xl border p-5 flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="bg-background rounded-xl border p-5">
                <PromptPanel
                  key={selectedMode}
                  modeKey={selectedMode}
                  defaultPrompt={DEFAULT_PROMPTS[selectedMode]}
                  savedOverride={overrides[selectedMode] ?? null}
                  onOverrideChange={handleOverrideChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
