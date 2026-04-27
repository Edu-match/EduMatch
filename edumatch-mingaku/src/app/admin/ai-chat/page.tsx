"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  FileText,
  Globe,
  Link2,
  MessageSquareMore,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ─── 型定義 ─────────────────────────────────────────────────

type AiMode = "navigator" | "debate" | "discussion" | "facilitator";

type KnowledgeDoc = {
  id: string;
  label: string;
  type: "url" | "text";
  content: string;
  addedAt: string;
};

type NewDocDraft = { label: string; type: "url" | "text"; content: string };

// ─── モードメタ ──────────────────────────────────────────────

const MODE_META: Record<AiMode, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  navigator: {
    label: "ナビゲーター",
    color: "text-blue-600",
    icon: <Bot className="h-4 w-4" />,
    description: "教育ICT全般をガイドするモード",
  },
  debate: {
    label: "ディベート",
    color: "text-rose-600",
    icon: <Zap className="h-4 w-4" />,
    description: "ユーザーの立場に反論するモード",
  },
  discussion: {
    label: "ディスカッション",
    color: "text-emerald-600",
    icon: <BookOpen className="h-4 w-4" />,
    description: "共感・肯定から始めるモード",
  },
  facilitator: {
    label: "AIファシリテーター",
    color: "text-violet-600",
    icon: <MessageSquareMore className="h-4 w-4" />,
    description: "井戸端会議で投稿に自動返信するモード",
  },
};

// ─── デフォルトシステムプロンプト（コードと同期） ───────────

const DEFAULT_PROMPTS: Record<AiMode, string> = {
  navigator: `あなたは教育ICT・EdTechに詳しいAIアシスタントです。このサイト（エデュマッチ）は教育サービス・教材のマッチングプラットフォームです。

## 回答の仕方
- **ユーザーの質問に自然に答える**：まず質問の内容そのものに答える
- **公的文書参照（RAG）の抜粋が含まれる場合**、教育・校務・法令・指導要領・政策・ICT教育などの話題では、**「〈文書名〉によれば」「〈文書名〉では」** を文中に含める
- **サイト内の関連サービス・記事**は、回答に自然に織り交ぜる
- **冗長にしない**：原則は3〜6文、長くても箇条書き3点まで
- **会話感を重視**：断定説明だけで終えず、必要なら最後に1つだけ確認質問を返す
- Markdown形式で読みやすく。日本語で丁寧に。`,

  debate: `あなたは「エデュマッチ」のAIディベートパートナーです。

## 絶対ルール
- ユーザーが示す立場・意見に対して **必ず正反対の立場** をとる（例外なし）
- ユーザーが賛成 → あなたは反対。ユーザーが反対 → あなたは賛成
- 回答の冒頭で「私は〇〇に反対（賛成）の立場をとります」と宣言する
- 感情論は使わず、**データ・事例・論理**で反論する
- ユーザーの論点を一つひとつ引用しながら丁寧に崩し、自分の主張を積み上げる
- 議論相手を尊重しつつも、論理的には鋭く切り込む

## 分量ルール（必須）
- **1ターンあたり3〜5文**に収める。長くなる場合は箇条書き最大3点。
- 反論の核心だけを届け、余分な前置き・まとめ・補足は省く。
- 最後に**必ず1つだけ**「あなたはその点についてどう考えますか？」等の問い返しをつける。

Markdown形式で論点を整理して返す。日本語で。`,

  discussion: `あなたは「エデュマッチ」のAIディスカッションパートナーです。

## スタンス
- まずユーザーの意見・感情を **共感・肯定** してから話を進める
- 一方的に正解を示さず、**問いかけ**を通じて一緒に考える姿勢を保つ
- 賛否・立場・背景など多様な視点を提示して思考を広げる
- 教育現場の実態・具体的な事例を交えて議論を豊かにする
- 会話のキャッチボールを意識し、次の問いで終わらせる

## 分量ルール（必須）
- **1ターンあたり3〜5文**に収める。長くなる場合は箇条書き最大3点。
- 共感→視点提示→問い返しの3ステップで完結させる。余分な解説は省く。
- 最後は**必ず問いかけ**で終わる（「〜についてはどうお考えですか？」など）。

Markdown形式で読みやすく整理。日本語で。`,

  facilitator: `あなたは「AIUEO井戸端会議」というオンラインコミュニティに参加するAIファシリテーターです。
教育現場の実践者・研究者・保護者・企業が集まるフォーラムで、議論を豊かにするサポートをしています。

## あなたの役割
- 投稿者の意見・経験を**まず肯定・共感**して受け止める
- 多様な視点（教員/保護者/行政/研究者/海外事例など）を補足して議論を広げる
- 具体的な事例・データ・問いかけで会話のキャッチボールを促す
- 「次にどんな意見が出るか」を引き出す問いで締めくくる
- 長くなりすぎず、**200〜350文字程度**で自然な会話トーンを保つ
- 「AI」であることを最初に一言添えても良いが、過度に強調しない

## 禁止事項
- 正解を断言しない（「〜が正解です」は使わない）
- 特定の製品・サービスの宣伝
- 政治的に偏った発言`,
};

// ─── ナレッジ文書 初期データ ────────────────────────────────

const INITIAL_DOCS: KnowledgeDoc[] = [
  { id: "doc-1", label: "学習指導要領（小・中・高）", type: "url", content: "https://www.mext.go.jp/a_menu/shotou/new-cs/1384661.htm", addedAt: "2026-04-01" },
  { id: "doc-2", label: "GIGAスクール構想", type: "url", content: "https://www.mext.go.jp/a_menu/other/index_00001.htm", addedAt: "2026-04-01" },
  { id: "doc-3", label: "OECDラーニングコンパス2030", type: "text", content: "OECD Learning Compass 2030は、生徒が自分の将来と社会の未来を形成するために必要な知識、スキル、態度と価値観を指す概念です。", addedAt: "2026-04-01" },
];

// ─── システムプロンプト編集セクション ──────────────────────

function SystemPromptSection() {
  const [prompts, setPrompts] = useState<Record<AiMode, string>>(DEFAULT_PROMPTS);
  const [editMode, setEditMode] = useState<Record<AiMode, boolean>>({
    navigator: false,
    debate: false,
    discussion: false,
    facilitator: false,
  });
  const [saved, setSaved] = useState<Record<AiMode, boolean>>({
    navigator: false,
    debate: false,
    discussion: false,
    facilitator: false,
  });

  const handleEdit = (mode: AiMode) => {
    setEditMode((p) => ({ ...p, [mode]: true }));
    setSaved((p) => ({ ...p, [mode]: false }));
  };

  const handleSave = (mode: AiMode) => {
    setEditMode((p) => ({ ...p, [mode]: false }));
    setSaved((p) => ({ ...p, [mode]: true }));
  };

  const handleCancel = (mode: AiMode) => {
    setPrompts((p) => ({ ...p, [mode]: DEFAULT_PROMPTS[mode] }));
    setEditMode((p) => ({ ...p, [mode]: false }));
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Pencil className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">システムプロンプト管理</h2>
      </div>

      <Tabs defaultValue="navigator">
        <TabsList className="grid w-full grid-cols-4">
          {(["navigator", "debate", "discussion", "facilitator"] as const).map((mode) => {
            const meta = MODE_META[mode];
            return (
              <TabsTrigger key={mode} value={mode} className="text-xs gap-1">
                <span className={meta.color}>{meta.icon}</span>
                <span className="hidden sm:inline">{meta.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(["navigator", "debate", "discussion", "facilitator"] as const).map((mode) => {
          const meta = MODE_META[mode];
          const isEditing = editMode[mode];
          const isSaved = saved[mode];

          return (
            <TabsContent key={mode} value={mode} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className={`flex items-center gap-2 text-sm ${meta.color}`}>
                        {meta.icon}{meta.label}
                      </CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    {!isEditing && (
                      <Button size="sm" variant="outline" onClick={() => handleEdit(mode)} className="shrink-0 gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />編集
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      <Textarea
                        rows={14}
                        value={prompts[mode]}
                        onChange={(e) => setPrompts((p) => ({ ...p, [mode]: e.target.value }))}
                        className="font-mono text-xs resize-y"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleCancel(mode)}>
                          <X className="h-3.5 w-3.5 mr-1" />キャンセル
                        </Button>
                        <Button size="sm" onClick={() => handleSave(mode)}>
                          <Save className="h-3.5 w-3.5 mr-1" />保存（UI反映）
                        </Button>
                      </div>
                    </>
                  ) : (
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground font-mono overflow-auto max-h-72">
                      {prompts[mode]}
                    </pre>
                  )}
                  {isSaved && !isEditing && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✓ UIに反映済み。本番反映はコードデプロイが必要です。
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <Card className="mt-3 border-amber-200/60 bg-amber-50/40">
        <CardContent className="p-3">
          <p className="text-xs text-amber-800 leading-5">
            <strong>注意：</strong>現在この画面での変更は UI セッション内のみ有効です。
            本番に反映するには、<code className="rounded bg-amber-100 px-1">src/app/api/chat/route.ts</code>（AIチャット）または
            <code className="rounded bg-amber-100 px-1">src/app/api/forum/ai-comment/route.ts</code>（ファシリテーター）
            を直接編集してデプロイしてください。
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── ナレッジ文書追加フォーム ────────────────────────────────

function AddDocForm({ onAdd }: { onAdd: (doc: KnowledgeDoc) => void }) {
  const [draft, setDraft] = useState<NewDocDraft>({ label: "", type: "url", content: "" });
  const [open, setOpen] = useState(false);
  const isValid = draft.label.trim() && draft.content.trim();

  const handleAdd = () => {
    if (!isValid) return;
    onAdd({
      id: `doc-${Date.now()}`,
      label: draft.label.trim(),
      type: draft.type,
      content: draft.content.trim(),
      addedAt: new Date().toISOString().slice(0, 10),
    });
    setDraft({ label: "", type: "url", content: "" });
    setOpen(false);
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />文書・URLを追加
      </Button>
    );
  }

  return (
    <Card className="border-dashed border-primary/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">新しい知識ソースを追加</p>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-1.5">
          <Label>ラベル（文書名）<span className="text-destructive ml-1">*</span></Label>
          <Input
            value={draft.label}
            onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
            placeholder="例：学習指導要領（高等学校）"
          />
        </div>
        <div className="space-y-1.5">
          <Label>種類</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft((p) => ({ ...p, type: "url" }))}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${draft.type === "url" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <Globe className="h-3.5 w-3.5" />URL
            </button>
            <button
              type="button"
              onClick={() => setDraft((p) => ({ ...p, type: "text" }))}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${draft.type === "text" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <FileText className="h-3.5 w-3.5" />テキスト
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{draft.type === "url" ? "URL" : "テキスト内容"}<span className="text-destructive ml-1">*</span></Label>
          {draft.type === "url" ? (
            <Input
              type="url"
              value={draft.content}
              onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))}
              placeholder="https://..."
            />
          ) : (
            <Textarea
              rows={4}
              value={draft.content}
              onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))}
              className="resize-none"
              placeholder="AIに参照させるテキストを貼り付けてください..."
            />
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>キャンセル</Button>
          <Button size="sm" onClick={handleAdd} disabled={!isValid}>
            <Save className="h-3.5 w-3.5 mr-1" />追加する
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocCard({ doc, onDelete }: { doc: KnowledgeDoc; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="mt-0.5 shrink-0 rounded-md bg-muted p-1.5">
        {doc.type === "url" ? <Link2 className="h-3.5 w-3.5 text-muted-foreground" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{doc.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {doc.type === "url" ? (
            <a href={doc.content} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
              {doc.content}
            </a>
          ) : (
            doc.content.slice(0, 80) + (doc.content.length > 80 ? "…" : "")
          )}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">{doc.addedAt} 追加</p>
      </div>
      <Button size="icon" variant="ghost" onClick={() => onDelete(doc.id)} className="shrink-0 h-7 w-7">
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

// ─── ナレッジ文書管理セクション ──────────────────────────────

function KnowledgeSection() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(INITIAL_DOCS);

  const handleAdd = (doc: KnowledgeDoc) => setDocs((prev) => [...prev, doc]);
  const handleDelete = (id: string) => {
    if (!window.confirm("この知識ソースを削除しますか？")) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">ナレッジ文書管理</h2>
          <Badge variant="secondary" className="text-xs">{docs.length} 件</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            RAGで全AIモードから参照される公的文書・参考資料を管理します。
          </p>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              まだ文書が登録されていません。
            </p>
          ) : (
            docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />
            ))
          )}
        </CardContent>
      </Card>

      <div className="mt-3">
        <AddDocForm onAdd={handleAdd} />
      </div>

      <Card className="mt-3 border-amber-200/60 bg-amber-50/40">
        <CardContent className="p-3">
          <p className="text-xs text-amber-800 leading-5">
            <strong>注意：</strong>現在この画面はUI表示のみです。追加・削除はページリロード後にリセットされます。
            本番運用時はSupabaseの <code className="rounded bg-amber-100 px-1">knowledge_chunks</code> テーブルへの
            ベクトル登録APIと連携する必要があります。
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── メインページ ─────────────────────────────────────────────

export default function AdminAiChatPage() {
  return (
    <div className="container max-w-4xl py-8 space-y-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
          <Link href="/provider-dashboard"><ArrowLeft className="mr-1 h-4 w-4" />ダッシュボード</Link>
        </Button>
        <h1 className="text-2xl font-bold">AIチャット管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          各AIモードのシステムプロンプトと、RAGで参照するナレッジ文書を管理します。
        </p>
      </div>

      <SystemPromptSection />

      <div className="border-t pt-8">
        <KnowledgeSection />
      </div>
    </div>
  );
}
