"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Eye, ExternalLink, EyeOff, Heart, Loader2, MessageSquare, PenSquare, Pin, PinOff, Plus, Save, Search, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ForumPost, ForumRoom } from "@/lib/mock-forum";
import { SettingToggleRow } from "@/components/ui/toggle-switch";
import { AdminForumCategories } from "./admin-forum-categories";
import { AdminForumSatellites } from "./admin-forum-satellites";

type PostFilter = "all" | "pinned" | "no-reply" | "hidden";
type NewRoomDraft = {
  name: string;
  description: string;
  aiDiscussion: boolean;
};

// ─── 部屋作成ダイアログ ───────────────────────────────────

function CreateRoomDialog({ onCreated }: { onCreated: (room: ForumRoom) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<NewRoomDraft>({
    name: "",
    description: "",
    aiDiscussion: true,
  });
  const isValid = draft.name.trim();

  const handleCreate = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/forum/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          weeklyTopic: "",
          aiDiscussion: draft.aiDiscussion,
          aiWeeklyTopicEnabled: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.room as ForumRoom);
        setDraft({
          name: "",
          description: "",
          aiDiscussion: true,
        });
        setOpen(false);
      } else {
        alert("部屋の作成に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />部屋を追加</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新しい部屋を作成</DialogTitle>
          <DialogDescription>フォーラムに新しいテーマ部屋を追加します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>部屋名 <span className="text-destructive">*</span></Label>
            <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="例: 保護者・家庭教育" />
          </div>
          <div className="space-y-1.5">
            <Label>説明文</Label>
            <Textarea rows={2} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} className="resize-none" placeholder="この部屋のテーマを簡潔に" />
          </div>
          <SettingToggleRow
            checked={draft.aiDiscussion}
            onCheckedChange={(aiDiscussion) => setDraft((p) => ({ ...p, aiDiscussion }))}
            icon={Zap}
            title="AIディスカッション"
            description="投稿にAIファシリテーターが返信し、議論をサポートします。"
            activeClassName="border-violet-300 bg-violet-50"
            iconClassName={draft.aiDiscussion ? "text-violet-600" : undefined}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!isValid || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              作成する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── メインクライアントコンポーネント ─────────────────────

export function AdminForumClient() {
  const [rooms, setRooms] = useState<ForumRoom[]>([]);
  // 投稿は「選択した部屋ぶんだけ」遅延ロード（以前は全部屋を一括fetchして固まっていた）。
  const [posts, setPosts] = useState<(ForumPost & { is_hidden?: boolean; isHidden?: boolean })[]>([]);
  const [stats, setStats] = useState<{ total: number; pinned: number; noReply: number; hidden: number } | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [roomKeyword, setRoomKeyword] = useState("");
  const [postKeyword, setPostKeyword] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(""); // "" = 未選択（部屋を選ぶと投稿を取得）
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [roomSort, setRoomSort] = useState<"posts" | "recent" | "name">("posts");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [roomDescDraft, setRoomDescDraft] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);

  // 部屋一覧＋上部集計のみマウント時に取得（軽量・即時表示）
  useEffect(() => {
    fetch("/api/forum/rooms?includeHidden=true", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.rooms) setRooms(data.rooms); })
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
    fetch("/api/admin/forum/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (typeof d.pinned === "number") setStats(d); })
      .catch(console.error);
  }, []);

  // 選択された部屋の投稿だけを遅延取得（投稿管理タブで部屋を選んだとき）
  useEffect(() => {
    if (!selectedRoom) { setPosts([]); return; }
    let cancelled = false;
    setLoadingPosts(true);
    fetch(`/api/forum/rooms/${selectedRoom}/posts?page=1&includeHidden=true`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPosts((d.posts ?? []) as ForumPost[]); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoadingPosts(false); });
    return () => { cancelled = true; };
  }, [selectedRoom]);

  const filteredRooms = useMemo(() => {
    const keyword = roomKeyword.trim().toLowerCase();
    const base = keyword
      ? rooms.filter((room) => [room.name, room.description].some((t) => (t ?? "").toLowerCase().includes(keyword)))
      : [...rooms];
    const lastAt = (r: ForumRoom) => new Date((r as { lastPostedAt?: string }).lastPostedAt ?? 0).getTime();
    if (roomSort === "posts") base.sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0));
    else if (roomSort === "name") base.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    else base.sort((a, b) => lastAt(b) - lastAt(a));
    return base;
  }, [roomKeyword, rooms, roomSort]);

  // posts は選択中の部屋のみ。キーワード＋状態フィルタだけ適用する。
  const filteredPosts = useMemo(() => {
    const keyword = postKeyword.trim().toLowerCase();
    return posts.filter((post) => {
      const inKeyword = !keyword || post.authorName.toLowerCase().includes(keyword) || post.body.toLowerCase().includes(keyword);
      const replies = post.replies?.length ?? post.replyCount ?? 0;
      const isHidden = Boolean(post.isHidden || post.is_hidden);
      const inFilter =
        postFilter === "all" ? !isHidden
        : postFilter === "pinned" ? Boolean(post.isPinned) && !isHidden
        : postFilter === "hidden" ? isHidden
        : replies === 0 && !isHidden;
      return inKeyword && inFilter;
    });
  }, [postFilter, postKeyword, posts]);

  // 上部集計は全件countのstatsから（全投稿fetchは廃止）。
  const pinnedCount = stats?.pinned ?? 0;
  const noReplyCount = stats?.noReply ?? 0;
  const hiddenCount = stats?.hidden ?? 0;
  const topRooms = [...rooms].sort((a, b) => b.postCount - a.postCount).slice(0, 20);
  const totalPosts = stats?.total ?? rooms.reduce((s, r) => s + (r.postCount ?? 0), 0);
  const activeRooms = rooms.filter((r) => (r.postCount ?? 0) > 0).length;
  const maxRoomPosts = topRooms[0]?.postCount ?? 0;

  const handleCreateRoom = (room: ForumRoom) => {
    setRooms((prev) => [...prev, room]);
  };

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (!window.confirm("部屋を削除します。関連投稿もすべて削除されます。")) return;
    try {
      const res = await fetch(`/api/forum/rooms/${roomId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        setPosts((prev) => prev.filter((p) => p.roomId !== roomId));
      } else {
        alert("削除に失敗しました");
      }
    } catch {
      alert("削除に失敗しました");
    }
  }, []);

  const handleHidePost = useCallback(async (postId: string) => {
    if (!window.confirm("この投稿を非表示にしますか？（削除ではなく非表示になります）")) return;
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isHidden: true }),
      });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isHidden: true, is_hidden: true } : p));
      } else {
        alert("非表示設定に失敗しました");
      }
    } catch {
      alert("非表示設定に失敗しました");
    }
  }, []);

  const handleUnhidePost = useCallback(async (postId: string) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isHidden: false }),
      });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isHidden: false, is_hidden: false } : p));
      } else {
        alert("再表示設定に失敗しました");
      }
    } catch {
      alert("再表示設定に失敗しました");
    }
  }, []);

  const handleSaveRoom = useCallback(async (roomId: string) => {
    if (savingRoom || !roomNameDraft.trim()) return;
    setSavingRoom(true);
    try {
      const res = await fetch(`/api/forum/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: roomNameDraft.trim(), description: roomDescDraft.trim() }),
      });
      if (res.ok) {
        setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, name: roomNameDraft.trim(), description: roomDescDraft.trim() } : r));
        setEditingRoomId(null);
      } else {
        alert("部屋情報の更新に失敗しました");
      }
    } finally {
      setSavingRoom(false);
    }
  }, [savingRoom, roomNameDraft, roomDescDraft]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!window.confirm("この投稿を完全に削除しますか？元に戻せません。")) return;
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        alert("削除に失敗しました");
      }
    } catch {
      alert("削除に失敗しました");
    }
  }, []);

  const handleToggleRoomHide = useCallback(async (roomId: string, currentHidden: boolean) => {
    try {
      const res = await fetch(`/api/forum/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isHidden: !currentHidden }),
      });
      if (res.ok) {
        setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, isHidden: !currentHidden } : r));
      } else {
        alert("非表示操作に失敗しました");
      }
    } catch {
      alert("非表示操作に失敗しました");
    }
  }, []);

  const handleTogglePin = useCallback(async (postId: string, currentPinned: boolean) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPinned: !currentPinned }),
      });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isPinned: !currentPinned } : p)));
      } else {
        alert("ピン留め操作に失敗しました");
      }
    } catch {
      alert("ピン留め操作に失敗しました");
    }
  }, []);

  const isLoading = loadingRooms;

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/provider-dashboard"><ArrowLeft className="mr-1 h-4 w-4" />ダッシュボード</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/forum" target="_blank"><ExternalLink className="mr-1 h-4 w-4" />井戸端会議を開く</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold">井戸端会議 管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">部屋・カテゴリ・サテライト・投稿をまとめて管理。非表示は削除ではなく is_hidden フラグで管理します。</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">部屋</p><p className="text-2xl font-bold">{rooms.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">注目投稿</p><p className="text-2xl font-bold">{pinnedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">返信待ち</p><p className="text-2xl font-bold">{noReplyCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">非表示</p><p className="text-2xl font-bold">{hiddenCount}</p></CardContent></Card>
      </div>

      {isLoading && (
        <div className="mt-8 flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      <Tabs defaultValue="rooms" className="mt-6 gap-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rooms">部屋管理</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ管理</TabsTrigger>
          <TabsTrigger value="satellites">サテライト</TabsTrigger>
          <TabsTrigger value="posts">投稿管理</TabsTrigger>
          <TabsTrigger value="insights">分析</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <AdminForumCategories />
        </TabsContent>

        <TabsContent value="satellites">
          <AdminForumSatellites />
        </TabsContent>

        <TabsContent value="rooms" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={roomKeyword} onChange={(e) => setRoomKeyword(e.target.value)} className="pl-9" placeholder="部屋名・説明で検索" />
            </div>
            <div className="flex items-center gap-1">
              {([["posts", "投稿数"], ["recent", "新着"], ["name", "名前"]] as const).map(([v, label]) => (
                <Button key={v} size="sm" variant={roomSort === v ? "default" : "outline"} onClick={() => setRoomSort(v)}>{label}</Button>
              ))}
            </div>
            <CreateRoomDialog onCreated={handleCreateRoom} />
          </div>
          <p className="text-xs text-muted-foreground">{filteredRooms.length}部屋</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredRooms.map((room) => (
              <Card key={room.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    {editingRoomId === room.id ? (
                      <div className="flex-1 space-y-2">
                        <Input
                          value={roomNameDraft}
                          onChange={(e) => setRoomNameDraft(e.target.value)}
                          className="h-7 text-sm font-semibold"
                          placeholder="部屋名"
                          autoFocus
                        />
                        <Textarea
                          rows={2}
                          value={roomDescDraft}
                          onChange={(e) => setRoomDescDraft(e.target.value)}
                          className="resize-none text-xs"
                          placeholder="説明文"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingRoomId(null)}>キャンセル</Button>
                          <Button size="sm" className="h-7 text-xs" disabled={savingRoom || !roomNameDraft.trim()} onClick={() => handleSaveRoom(room.id)}>
                            {savingRoom ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold">{room.name}</p>
                        {room.aiDiscussion && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 shrink-0">
                            <Zap className="h-2.5 w-2.5" />AI
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {editingRoomId !== room.id && <p className="text-xs text-muted-foreground line-clamp-2">{room.description || "説明なし"}</p>}
                  {editingRoomId !== room.id && (
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{room.postCount ?? 0}</span>
                      {room.isHidden && <Badge variant="outline" className="border-dashed text-[10px] text-muted-foreground"><EyeOff className="mr-1 h-3 w-3" />非表示</Badge>}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <Link href={`/forum/${room.id}`} target="_blank" className="text-xs text-primary hover:underline"><ExternalLink className="mr-1 inline h-3 w-3" />表示</Link>
                    {editingRoomId !== room.id && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" title="部屋名・説明を編集" onClick={() => { setRoomNameDraft(room.name); setRoomDescDraft(room.description ?? ""); setEditingRoomId(room.id); }}>
                          <PenSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="sm" variant="ghost" title={room.isHidden ? "再表示" : "非表示"} onClick={() => handleToggleRoomHide(room.id, !!room.isHidden)}>
                          {room.isHidden ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteRoom(room.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={postKeyword} onChange={(e) => setPostKeyword(e.target.value)} className="pl-9" placeholder="投稿本文・投稿者で検索" />
          </div>
          <p className="text-xs text-muted-foreground">部屋を選ぶと、その部屋の投稿だけを読み込みます（全件一括取得をやめ高速化）。</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {rooms.map((room) => <Button key={room.id} size="sm" variant={selectedRoom === room.id ? "default" : "outline"} onClick={() => setSelectedRoom(room.id)}>{room.name}</Button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={postFilter === "all" ? "default" : "outline"} onClick={() => setPostFilter("all")}>すべて</Button>
            <Button size="sm" variant={postFilter === "pinned" ? "default" : "outline"} onClick={() => setPostFilter("pinned")}>注目</Button>
            <Button size="sm" variant={postFilter === "no-reply" ? "default" : "outline"} onClick={() => setPostFilter("no-reply")}>返信待ち</Button>
            <Button size="sm" variant={postFilter === "hidden" ? "default" : "outline"} onClick={() => setPostFilter("hidden")}><EyeOff className="mr-1 h-3.5 w-3.5" />非表示</Button>
          </div>
          {!selectedRoom ? (
            <p className="py-8 text-center text-sm text-muted-foreground">上の部屋を選んでください。</p>
          ) : loadingPosts ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">この条件の投稿はありません。</p>
          ) : (
          <div className="space-y-2">
            {filteredPosts.map((post) => {
              const isHiddenPost = Boolean(post.isHidden || post.is_hidden);
              return (
                <Card key={post.id} className={isHiddenPost ? "opacity-60" : ""}><CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary">{rooms.find((r) => r.id === post.roomId)?.name ?? post.roomId}</Badge>
                    <span className="text-xs">{post.authorName}</span>
                    {isHiddenPost && <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed"><EyeOff className="mr-1 h-3 w-3" />非表示中</Badge>}
                  </div>
                  <p className="text-sm line-clamp-2 text-muted-foreground">{post.body}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likeCount ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.replyCount ?? post.replies?.length ?? 0}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {!isHiddenPost && (
                      <Button size="sm" variant={post.isPinned ? "secondary" : "outline"} onClick={() => handleTogglePin(post.id, !!post.isPinned)}>
                        {post.isPinned ? <><PinOff className="mr-1 h-3.5 w-3.5" />解除</> : <><Pin className="mr-1 h-3.5 w-3.5" />注目</>}
                      </Button>
                    )}
                    {isHiddenPost ? (
                      <Button size="sm" variant="outline" onClick={() => handleUnhidePost(post.id)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />再表示
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleHidePost(post.id)}>
                        <EyeOff className="mr-1 h-3.5 w-3.5 text-destructive" />非表示
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDeletePost(post.id)} title="完全削除">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent></Card>
              );
            })}
          </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* サマリ */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">総投稿</p><p className="text-2xl font-bold">{totalPosts}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">稼働部屋</p><p className="text-2xl font-bold">{activeRooms}<span className="ml-1 text-sm font-normal text-muted-foreground">/ {rooms.length}</span></p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">1部屋平均</p><p className="text-2xl font-bold">{rooms.length ? Math.round((totalPosts / rooms.length) * 10) / 10 : 0}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">返信待ち</p><p className="text-2xl font-bold">{noReplyCount}</p></CardContent></Card>
          </div>

          {/* 投稿数ランキング TOP20（横棒） */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" />投稿数ランキング TOP20</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topRooms.map((room, i) => {
                const pct = maxRoomPosts > 0 ? Math.round(((room.postCount ?? 0) / maxRoomPosts) * 100) : 0;
                return (
                  <div key={room.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <span className="w-32 shrink-0 truncate sm:w-44" title={room.name}>{room.name}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-primary/70" style={{ width: `${Math.max(pct, room.postCount ? 4 : 0)}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{room.postCount ?? 0}</span>
                  </div>
                );
              })}
              {topRooms.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">データがありません。</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
