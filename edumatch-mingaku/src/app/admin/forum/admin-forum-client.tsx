"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Eye, ExternalLink, EyeOff, Heart, Loader2, MessageSquare, PenSquare, Pin, PinOff, Plus, Save, Search, Sparkles, Trash2, Zap } from "lucide-react";
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

type PostFilter = "all" | "pinned" | "no-reply" | "hidden";
type NewRoomDraft = {
  name: string;
  description: string;
  weeklyTopic: string;
  aiDiscussion: boolean;
  aiWeeklyTopicEnabled: boolean;
};

// ─── 部屋作成ダイアログ ───────────────────────────────────

function CreateRoomDialog({ onCreated }: { onCreated: (room: ForumRoom) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<NewRoomDraft>({
    name: "",
    description: "",
    weeklyTopic: "",
    aiDiscussion: true,
    aiWeeklyTopicEnabled: true,
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
          weeklyTopic: draft.aiWeeklyTopicEnabled ? "" : draft.weeklyTopic.trim(),
          aiDiscussion: draft.aiDiscussion,
          aiWeeklyTopicEnabled: draft.aiWeeklyTopicEnabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.room as ForumRoom);
        setDraft({
          name: "",
          description: "",
          weeklyTopic: "",
          aiDiscussion: true,
          aiWeeklyTopicEnabled: true,
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
            checked={draft.aiWeeklyTopicEnabled}
            onCheckedChange={(aiWeeklyTopicEnabled) => setDraft((p) => ({ ...p, aiWeeklyTopicEnabled }))}
            icon={Sparkles}
            title="AI が週次で「今週のお題」を設定する"
            description="部屋名と説明をもとに、お題を自動で作成します。"
            activeClassName="border-sky-300 bg-sky-50"
            iconClassName={draft.aiWeeklyTopicEnabled ? "text-sky-600" : undefined}
          />

          {!draft.aiWeeklyTopicEnabled && (
            <div className="space-y-1.5">
              <Label>
                今週のお題{" "}
                <span className="text-xs text-muted-foreground">（任意・後から設定可）</span>
              </Label>
              <Textarea
                rows={3}
                value={draft.weeklyTopic}
                onChange={(e) => setDraft((p) => ({ ...p, weeklyTopic: e.target.value }))}
                className="resize-none"
                placeholder="参加者への問いかけを入力してください"
              />
            </div>
          )}

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
  const [posts, setPosts] = useState<(ForumPost & { is_hidden?: boolean; isHidden?: boolean })[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [roomKeyword, setRoomKeyword] = useState("");
  const [postKeyword, setPostKeyword] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [editingTopicRoomId, setEditingTopicRoomId] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [roomDescDraft, setRoomDescDraft] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);

  // 部屋一覧取得（非表示含む・管理者モード）
  useEffect(() => {
    fetch("/api/forum/rooms?includeHidden=true", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.rooms) setRooms(data.rooms); })
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 全投稿取得（全部屋分・非表示含む）
  useEffect(() => {
    if (loadingRooms) return;
    if (rooms.length === 0) {
      setLoadingPosts(false);
      return;
    }
    Promise.all(
      rooms.map((room) =>
        fetch(`/api/forum/rooms/${room.id}/posts?page=1&includeHidden=true`, { credentials: "include" })
          .then((r) => r.json())
          .then((d) => (d.posts ?? []) as ForumPost[])
          .catch(() => [] as ForumPost[])
      )
    ).then((allPosts) => {
      setPosts(allPosts.flat());
    }).finally(() => setLoadingPosts(false));
  }, [rooms, loadingRooms]);

  const filteredRooms = useMemo(() => {
    const keyword = roomKeyword.trim().toLowerCase();
    if (!keyword) return rooms;
    return rooms.filter((room) => [room.name, room.description, room.weeklyTopic].some((t) => t.toLowerCase().includes(keyword)));
  }, [roomKeyword, rooms]);

  const filteredPosts = useMemo(() => {
    const keyword = postKeyword.trim().toLowerCase();
    return posts.filter((post) => {
      const inRoom = selectedRoom === "all" || post.roomId === selectedRoom;
      const inKeyword = !keyword || post.authorName.toLowerCase().includes(keyword) || post.body.toLowerCase().includes(keyword);
      const replies = post.replies?.length ?? post.replyCount ?? 0;
      const isHidden = Boolean(post.isHidden || post.is_hidden);
      const inFilter =
        postFilter === "all" ? !isHidden
        : postFilter === "pinned" ? Boolean(post.isPinned) && !isHidden
        : postFilter === "hidden" ? isHidden
        : replies === 0 && !isHidden;
      return inRoom && inKeyword && inFilter;
    });
  }, [postFilter, postKeyword, posts, selectedRoom]);

  const pinnedCount = posts.filter((post) => post.isPinned).length;
  const noReplyCount = posts.filter((post) => (post.replies?.length ?? post.replyCount ?? 0) === 0 && !post.isHidden && !post.is_hidden).length;
  const hiddenCount = posts.filter((post) => post.isHidden || post.is_hidden).length;
  const topRooms = [...rooms].sort((a, b) => b.postCount - a.postCount).slice(0, 5);

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

  const handleSaveTopic = useCallback(async (roomId: string) => {
    if (savingTopic) return;
    setSavingTopic(true);
    try {
      const res = await fetch(`/api/forum/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weeklyTopic: topicDraft.trim() }),
      });
      if (res.ok) {
        setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, weeklyTopic: topicDraft.trim() } : r));
        setEditingTopicRoomId(null);
      } else {
        alert("お題の更新に失敗しました");
      }
    } finally {
      setSavingTopic(false);
    }
  }, [savingTopic, topicDraft]);

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

  const isLoading = loadingRooms || loadingPosts;

  return (
    <div className="container max-w-5xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
        <Link href="/provider-dashboard"><ArrowLeft className="mr-1 h-4 w-4" />ダッシュボード</Link>
      </Button>
      <h1 className="text-2xl font-bold">井戸端会議 管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">部屋・投稿の管理。非表示は削除ではなく is_hidden フラグで管理します。</p>

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rooms">部屋管理</TabsTrigger>
          <TabsTrigger value="posts">投稿管理</TabsTrigger>
          <TabsTrigger value="insights">分析</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={roomKeyword} onChange={(e) => setRoomKeyword(e.target.value)} className="pl-9" placeholder="部屋名・説明・お題で検索" />
            </div>
            <CreateRoomDialog onCreated={handleCreateRoom} />
          </div>
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
                  {editingTopicRoomId === room.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        rows={3}
                        value={topicDraft}
                        onChange={(e) => setTopicDraft(e.target.value)}
                        className="resize-none text-xs"
                        placeholder="今週のお題を入力"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingTopicRoomId(null)}>キャンセル</Button>
                        <Button size="sm" className="h-7 text-xs" disabled={savingTopic} onClick={() => handleSaveTopic(room.id)}>
                          {savingTopic ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-start gap-1">
                      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{room.weeklyTopic || "お題未設定"}</p>
                      <button
                        type="button"
                        onClick={() => { setTopicDraft(room.weeklyTopic); setEditingTopicRoomId(room.id); }}
                        className="shrink-0 p-0.5 text-muted-foreground hover:text-primary transition-colors"
                        title="お題を編集"
                      >
                        <PenSquare className="h-3 w-3" />
                      </button>
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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={selectedRoom === "all" ? "default" : "outline"} onClick={() => setSelectedRoom("all")}>全ルーム</Button>
            {rooms.map((room) => <Button key={room.id} size="sm" variant={selectedRoom === room.id ? "default" : "outline"} onClick={() => setSelectedRoom(room.id)}>{room.name}</Button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={postFilter === "all" ? "default" : "outline"} onClick={() => setPostFilter("all")}>すべて</Button>
            <Button size="sm" variant={postFilter === "pinned" ? "default" : "outline"} onClick={() => setPostFilter("pinned")}>注目</Button>
            <Button size="sm" variant={postFilter === "no-reply" ? "default" : "outline"} onClick={() => setPostFilter("no-reply")}>返信待ち</Button>
            <Button size="sm" variant={postFilter === "hidden" ? "default" : "outline"} onClick={() => setPostFilter("hidden")}><EyeOff className="mr-1 h-3.5 w-3.5" />非表示 {hiddenCount > 0 && `(${hiddenCount})`}</Button>
          </div>
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
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" />投稿数ランキング</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {topRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between text-sm">
                  <span>{room.name}</span>
                  <span className="text-muted-foreground">{room.postCount} 投稿</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
