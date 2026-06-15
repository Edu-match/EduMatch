"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, FileText, Loader2, Plus, Save, Search, Sparkles, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingToggleRow } from "@/components/ui/toggle-switch";

type RoomInput = { id: string; name: string; description: string; aiDiscussion: boolean };
type LinkedItem = {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  href: string;
  meta: string | null;
  rankOrder: number;
};
type Candidate = {
  sourceType: string;
  sourceId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  href: string;
  meta: string | null;
};

const kindLabel = (t: string) => (t === "service" ? "サービス" : "記事");

export function EditRoomForm({ room }: { room: RoomInput }) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description);
  const [aiDiscussion, setAiDiscussion] = useState(room.aiDiscussion);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const [items, setItems] = useState<LinkedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const apiBase = `/api/forum/rooms/${room.id}/related-content`;

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await fetch(apiBase, { credentials: "include" });
      const d = await res.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [apiBase]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const saveRoom = async () => {
    if (!name.trim() || savingRoom) return;
    setSavingRoom(true);
    setSavedMsg(false);
    try {
      const res = await fetch(`/api/forum/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), description: description.trim(), aiDiscussion }),
      });
      if (res.ok) { setSavedMsg(true); window.setTimeout(() => setSavedMsg(false), 2500); }
      else alert("部屋情報の保存に失敗しました");
    } finally {
      setSavingRoom(false);
    }
  };

  const runSearch = async (action: "search" | "ai-search") => {
    const setBusy = action === "ai-search" ? setAiSearching : setSearching;
    setBusy(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, q: query.trim() }),
      });
      const d = await res.json();
      setResults(Array.isArray(d.results) ? d.results : []);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (c: Candidate) => {
    setBusyKey(`${c.sourceType}:${c.sourceId}`);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "add", item: c }),
      });
      if (res.ok) await loadItems();
      else alert("追加に失敗しました");
    } finally {
      setBusyKey(null);
    }
  };

  const removeItem = async (id: string) => {
    setBusyKey(id);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "remove", id }),
      });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setBusyKey(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "reorder", ids: next.map((i) => i.id) }),
    }).catch(() => {});
  };

  const linkedKeys = new Set(items.map((i) => `${i.sourceType}:${i.sourceId}`));

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/admin/forum"><ArrowLeft className="mr-1 h-4 w-4" />管理に戻る</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/forum/${room.id}`} target="_blank"><ExternalLink className="mr-1 h-4 w-4" />部屋を見る</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold">部屋を編集</h1>

      {/* 基本情報 */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>部屋名 <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>説明文</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" />
          </div>
          <SettingToggleRow
            checked={aiDiscussion}
            onCheckedChange={setAiDiscussion}
            icon={Zap}
            title="AIディスカッション"
            description="投稿にAIファシリテーターが返信し、議論をサポートします。"
            activeClassName="border-violet-300 bg-violet-50"
            iconClassName={aiDiscussion ? "text-violet-600" : undefined}
          />
          <div className="flex items-center justify-end gap-3">
            {savedMsg && <span className="text-xs text-emerald-400">保存しました</span>}
            <Button onClick={saveRoom} disabled={!name.trim() || savingRoom}>
              {savingRoom ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              基本情報を保存
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 関連コンテンツ */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">関連コンテンツ（記事・サービス）</CardTitle>
          <p className="text-xs text-muted-foreground">部屋ページの上部に表示されます。AIで自動検索するか、キーワードで探して追加できます。</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 検索バー */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch("search"); }}
                className="pl-9"
                placeholder="記事・サービスをキーワードで検索"
              />
            </div>
            <Button variant="outline" onClick={() => runSearch("search")} disabled={searching}>
              {searching ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1 h-3.5 w-3.5" />}検索
            </Button>
            <Button onClick={() => runSearch("ai-search")} disabled={aiSearching} className="gap-1.5">
              {aiSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}AIで自動検索
            </Button>
          </div>

          {/* 検索結果 */}
          {results.length > 0 && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <p className="px-1 text-xs text-muted-foreground">候補（タップで追加）</p>
              {results.map((c) => {
                const key = `${c.sourceType}:${c.sourceId}`;
                const linked = linkedKeys.has(key);
                return (
                  <div key={key} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] p-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-white/5"><FileText className="h-4 w-4 text-muted-foreground" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{kindLabel(c.sourceType)}{c.meta ? ` · ${c.meta}` : ""}</p>
                    </div>
                    <Button size="sm" variant={linked ? "secondary" : "outline"} disabled={linked || busyKey === key} onClick={() => addItem(c)}>
                      {busyKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : linked ? "追加済" : <><Plus className="mr-1 h-3.5 w-3.5" />追加</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 紐付け済み一覧 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">紐付け済み（{items.length}件・上から順に表示）</p>
            {loadingItems ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">まだ紐付けがありません。</p>
            ) : (
              items.map((it, i) => (
                <div key={it.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-muted-foreground disabled:opacity-30 hover:text-white"><ChevronDown className="h-4 w-4" /></button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{kindLabel(it.sourceType)}{it.meta ? ` · ${it.meta}` : ""}</p>
                  </div>
                  <Link href={it.href} target="_blank" className="text-muted-foreground hover:text-white"><ExternalLink className="h-4 w-4" /></Link>
                  <Button size="icon" variant="ghost" disabled={busyKey === it.id} onClick={() => removeItem(it.id)}>
                    {busyKey === it.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
