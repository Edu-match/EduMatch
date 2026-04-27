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

type ChatMode = "navigator" | "debate" | "discussion";

type KnowledgeDoc = {
  id: string;
  mode: ChatMode;
  label: string;
  type: "url" | "text";
  content: string;
  addedAt: string;
};

const MODE_META: Record<ChatMode, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  navigator: {
    label: "ナビゲーターモード",
    color: "text-blue-600",
    icon: <Bot className="h-4 w-4" />,
    description: "学習指導要領・GIGAスクール等の文書を参照し、教育ICT全般をガイドします",
  },
  debate: {
    label: "ディベートモード",
    color: "text-rose-600",
    icon: <Zap className="h-4 w-4" />,
    description: "ユーザーの立場に反論し、論理的なディベート練習をサポートします",
  },
  discussion: {
    label: "ディスカッションモード",
    color: "text-emerald-600",
    icon: <BookOpen className="h-4 w-4" />,
    description: "共感・肯定から始め、問いかけで思考を深めるディスカッションを促します",
  },
};

const INITIAL_DOCS: KnowledgeDoc[] = [
  { id: "doc-1", mode: "navigator", label: "学習指導要領（小・中・高）", type: "url", content: "https://www.mext.go.jp/a_menu/shotou/new-cs/1384661.htm", addedAt: "2026-04-01" },
  { id: "doc-2", mode: "navigator", label: "GIGAスクール構想", type: "url", content: "https://www.mext.go.jp/a_menu/other/index_00001.htm", addedAt: "2026-04-01" },
  { id: "doc-3", mode: "navigator", label: "1ラーニングコンパス（OECD）", type: "text", content: "OECD Learning Compass 2030は、生徒が自分の将来と社会の未来を形成するために必要な知識、スキル、態度と価値観を指す概念です。", addedAt: "2026-04-01" },
];

type NewDocDraft = { label: string; type: "url" | "text"; content: string };

function AddDocForm({ mode, onAdd }: { mode: ChatMode; onAdd: (doc: KnowledgeDoc) => void }) {
  const [draft, setDraft] = useState<NewDocDraft>({ label: "", type: "url", content: "" });
  const [open, setOpen] = useState(false);
  const isValid = draft.label.trim() && draft.content.trim();

  const handleAdd = () => {
    if (!isValid) return;
    onAdd({
      id: `doc-${Date.now()}`,
      mode,
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

export default function AdminAiChatPage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(INITIAL_DOCS);
  const [activeMode, setActiveMode] = useState<ChatMode>("navigator");

  const handleAdd = (doc: KnowledgeDoc) => setDocs((prev) => [...prev, doc]);
  const handleDelete = (id: string) => {
    if (!window.confirm("この知識ソースを削除しますか？")) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const docsByMode = (mode: ChatMode) => docs.filter((d) => d.mode === mode);

  return (
    <div className="container max-w-4xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
        <Link href="/provider-dashboard"><ArrowLeft className="mr-1 h-4 w-4" />ダッシュボード</Link>
      </Button>
      <h1 className="text-2xl font-bold">AIチャット管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        各AIモードに参照させる知識文書（URL・テキスト）を管理します。
        追加した文書はRAGを通じてAIの回答に反映されます。
      </p>

      {/* モード概要 */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(["navigator", "debate", "discussion"] as const).map((mode) => {
          const meta = MODE_META[mode];
          const count = docsByMode(mode).length;
          return (
            <Card
              key={mode}
              className={`cursor-pointer transition-shadow hover:shadow-sm ${activeMode === mode ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveMode(mode)}
            >
              <CardContent className="p-4">
                <div className={`flex items-center gap-2 mb-1 font-semibold text-sm ${meta.color}`}>
                  {meta.icon}{meta.label}
                </div>
                <p className="text-xs text-muted-foreground leading-5">{meta.description}</p>
                <Badge variant="secondary" className="mt-2 text-xs">{count} 件の文書</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ドキュメント管理 */}
      <div className="mt-6">
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as ChatMode)}>
          <TabsList className="grid w-full grid-cols-3">
            {(["navigator", "debate", "discussion"] as const).map((mode) => (
              <TabsTrigger key={mode} value={mode} className="text-xs">
                {MODE_META[mode].label}
                {docsByMode(mode).length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">{docsByMode(mode).length}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {(["navigator", "debate", "discussion"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-3 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className={`flex items-center gap-2 text-sm ${MODE_META[mode].color}`}>
                    {MODE_META[mode].icon}
                    {MODE_META[mode].label} — 参照文書一覧
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {docsByMode(mode).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      まだ文書が登録されていません。
                    </p>
                  ) : (
                    docsByMode(mode).map((doc) => (
                      <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />
                    ))
                  )}
                </CardContent>
              </Card>
              <AddDocForm mode={mode} onAdd={handleAdd} />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 注意事項 */}
      <Card className="mt-6 border-amber-200/60 bg-amber-50/40">
        <CardContent className="p-4">
          <p className="text-xs text-amber-800 leading-5">
            <strong>注意：</strong>現在この画面はUI表示のみです。追加・削除はページリロード後にリセットされます。
            本番運用時はSupabaseの <code className="rounded bg-amber-100 px-1">knowledge_chunks</code> テーブルへの
            ベクトル登録APIと連携する必要があります。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
