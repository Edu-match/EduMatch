"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Eye, ExternalLink, EyeOff, Heart, Loader2, MessageSquare, PenSquare, Pin, PinOff, Plus, Search, Sparkles, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ForumPost, ForumRoom } from "@/lib/mock-forum";
import { AdminForumSatellites } from "./admin-forum-satellites";
import { AdminLlmTestButton } from "./admin-llm-test-button";

type PostFilter = "all" | "pinned" | "no-reply" | "hidden";
const ROOMS_PER_PAGE = 20;

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
  const [selectedRoom, setSelectedRoom] = useState(""); // "" = 未選択（ソースを選ぶと投稿を取得）
  // 投稿管理のソース種別：テーマ部屋(forum) かサテライト・特設(interop)。
  const [sourceType, setSourceType] = useState<"room" | "interop">("room");
  const [interopSubs, setInteropSubs] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [sourceKeyword, setSourceKeyword] = useState(""); // ソース一覧の絞り込み
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [roomSort, setRoomSort] = useState<"posts" | "recent" | "name">("posts");
  const [roomPage, setRoomPage] = useState(1);
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
    // サテライト・特設（interop サブカテゴリ）一覧も取得して、投稿管理のソースに出す。
    fetch("/api/interop/sub-categories?all=true", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.subCategories)) setInteropSubs(d.subCategories.map((s: { id: string; name: string; slug: string }) => ({ id: s.id, name: s.name, slug: s.slug }))); })
      .catch(console.error);
  }, []);

  // 選択されたソース（部屋 or interopサブ）の投稿だけを遅延取得。
  useEffect(() => {
    if (!selectedRoom) { setPosts([]); return; }
    let cancelled = false;
    setLoadingPosts(true);
    const url = sourceType === "interop"
      ? `/api/interop/posts?subCategoryId=${selectedRoom}&includeHidden=true`
      : `/api/forum/rooms/${selectedRoom}/posts?page=1&includeHidden=true`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const raw = (d.posts ?? []) as Array<Record<string, unknown>>;
        // interop と forum で形が違うので共通形へ正規化する。
        setPosts(raw.map((p) => ({
          ...(p as object),
          id: p.id as string,
          authorName: (p.authorName ?? p.author_name ?? "匿名") as string,
          body: (p.body ?? "") as string,
          isPinned: Boolean(p.isPinned ?? p.is_pinned),
          isHidden: Boolean(p.isHidden ?? p.is_hidden),
          is_hidden: Boolean(p.isHidden ?? p.is_hidden),
          likeCount: (p.likeCount ?? p.like_count ?? 0) as number,
          replyCount: (p.replyCount ?? (Array.isArray(p.replies) ? p.replies.length : 0)) as number,
          roomId: selectedRoom,
        })) as (ForumPost & { is_hidden?: boolean; isHidden?: boolean })[]);
      })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoadingPosts(false); });
    return () => { cancelled = true; };
  }, [selectedRoom, sourceType]);

  // ソース種別ごとの投稿モデレーションAPIのベースパス（hide/pin/delete 共通形）
  const postApiBase = sourceType === "interop" ? "/api/interop/posts" : "/api/forum/posts";

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

  // 部屋一覧は20件ごとにページ分割（多すぎて縦に伸びるのを防ぐ）
  const totalRoomPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
  const safeRoomPage = Math.min(roomPage, totalRoomPages);
  const pagedRooms = useMemo(
    () => filteredRooms.slice((safeRoomPage - 1) * ROOMS_PER_PAGE, safeRoomPage * ROOMS_PER_PAGE),
    [filteredRooms, safeRoomPage],
  );

  // 検索語・並び替えが変わったら1ページ目に戻す
  useEffect(() => { setRoomPage(1); }, [roomKeyword, roomSort]);

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

  // 投稿管理のソース一覧（テーマ部屋 or サテライト・特設）。掲示板管理タブと同じ「投稿数の多い順」
  // で並べ、両タブの見え方を一致させる（以前は取得順のままで、片方に無いように見えていた）。
  const postSourceList = useMemo(() => {
    const kw = sourceKeyword.trim().toLowerCase();
    const base = sourceType === "interop"
      ? interopSubs.map((s) => ({ id: s.id, name: s.name }))
      : [...rooms]
          .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0))
          .map((r) => ({ id: r.id, name: r.name }));
    return kw ? base.filter((s) => s.name.toLowerCase().includes(kw)) : base;
  }, [sourceType, sourceKeyword, interopSubs, rooms]);
  const selectedSourceName =
    (sourceType === "interop" ? interopSubs : rooms).find((s) => s.id === selectedRoom)?.name ?? "";

  // 上部集計は全件countのstatsから（全投稿fetchは廃止）。
  const pinnedCount = stats?.pinned ?? 0;
  const noReplyCount = stats?.noReply ?? 0;
  const hiddenCount = stats?.hidden ?? 0;
  const topRooms = [...rooms].sort((a, b) => b.postCount - a.postCount).slice(0, 20);
  const totalPosts = stats?.total ?? rooms.reduce((s, r) => s + (r.postCount ?? 0), 0);
  const activeRooms = rooms.filter((r) => (r.postCount ?? 0) > 0).length;
  const maxRoomPosts = topRooms[0]?.postCount ?? 0;

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
      const res = await fetch(`${postApiBase}/${postId}`, {
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
  }, [postApiBase]);

  const handleUnhidePost = useCallback(async (postId: string) => {
    try {
      const res = await fetch(`${postApiBase}/${postId}`, {
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
  }, [postApiBase]);

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
      const res = await fetch(`${postApiBase}/${postId}`, {
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
  }, [postApiBase]);

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
      const res = await fetch(`${postApiBase}/${postId}`, {
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
  }, [postApiBase]);

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

      <Tabs defaultValue="boards" className="mt-6 gap-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="boards">掲示板管理</TabsTrigger>
          <TabsTrigger value="posts">投稿管理</TabsTrigger>
          <TabsTrigger value="insights">分析</TabsTrigger>
        </TabsList>

        <TabsContent value="boards" className="space-y-6">
          {/* 階層① 中心インタロップ直行のサテライト */}
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-bold">サテライト（中心インタロップ直行）</h2>
              <p className="text-xs text-muted-foreground">最新ニュース・登壇者への質問・ご意見BOX。マップ中心の周りに固定表示される特別な掲示板です。</p>
            </div>
            <AdminForumSatellites />
          </section>

          {/* 階層② テーマ別の部屋（一般の掲示板） */}
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-bold">テーマ別の部屋</h2>
              <p className="text-xs text-muted-foreground">マップ上に話題の泡として並ぶ、テーマごとの掲示板です。</p>
            </div>
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
            <Button asChild size="sm" className="gap-1.5"><Link href="/admin/forum/rooms/new"><Plus className="h-4 w-4" />部屋を追加</Link></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredRooms.length}部屋
            {totalRoomPages > 1 && `（${safeRoomPage} / ${totalRoomPages}ページ）`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {pagedRooms.map((room) => (
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
                        <Button asChild size="sm" variant="ghost" title="詳細編集（関連コンテンツの紐付け）">
                          <Link href={`/admin/forum/rooms/${room.id}/edit`}><Sparkles className="h-3.5 w-3.5 text-muted-foreground" /></Link>
                        </Button>
                        <Button size="sm" variant="ghost" title="部屋名・説明をその場で編集" onClick={() => { setRoomNameDraft(room.name); setRoomDescDraft(room.description ?? ""); setEditingRoomId(room.id); }}>
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
          {totalRoomPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={safeRoomPage <= 1} onClick={() => setRoomPage((p) => Math.max(1, p - 1))}>前へ</Button>
              <span className="text-xs text-muted-foreground tabular-nums">{safeRoomPage} / {totalRoomPages}</span>
              <Button size="sm" variant="outline" disabled={safeRoomPage >= totalRoomPages} onClick={() => setRoomPage((p) => Math.min(totalRoomPages, p + 1))}>次へ</Button>
            </div>
          )}
          </section>
        </TabsContent>

        <TabsContent value="posts" className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={postKeyword} onChange={(e) => setPostKeyword(e.target.value)} className="pl-9" placeholder="投稿本文・投稿者で検索" />
          </div>
          {/* ソース種別切替（テーマ部屋 / サテライト・特設）。サテライト・特設＝中心インタロップ直行＋議員会館ご意見などの掲示板も管理できる。 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border">
              <button type="button" onClick={() => { setSourceType("room"); setSelectedRoom(""); }} className={`px-3 py-1.5 text-xs font-semibold transition ${sourceType === "room" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>テーマ部屋</button>
              <button type="button" onClick={() => { setSourceType("interop"); setSelectedRoom(""); }} className={`px-3 py-1.5 text-xs font-semibold transition ${sourceType === "interop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>サテライト・特設</button>
            </div>
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={sourceKeyword} onChange={(e) => setSourceKeyword(e.target.value)} className="h-8 pl-8 text-xs" placeholder={sourceType === "room" ? "部屋を絞り込み" : "サテライト・特設を絞り込み"} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">ソースを選ぶと、その掲示板の投稿だけを読み込みます（非表示・固定も含む）。</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-2">
            {postSourceList.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">該当するソースがありません。</p>
            ) : postSourceList.map((s) => (
              <Button key={s.id} size="sm" variant={selectedRoom === s.id ? "default" : "outline"} onClick={() => setSelectedRoom(s.id)}>{s.name}</Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={postFilter === "all" ? "default" : "outline"} onClick={() => setPostFilter("all")}>すべて</Button>
            <Button size="sm" variant={postFilter === "pinned" ? "default" : "outline"} onClick={() => setPostFilter("pinned")}>注目</Button>
            <Button size="sm" variant={postFilter === "no-reply" ? "default" : "outline"} onClick={() => setPostFilter("no-reply")}>返信待ち</Button>
            <Button size="sm" variant={postFilter === "hidden" ? "default" : "outline"} onClick={() => setPostFilter("hidden")}><EyeOff className="mr-1 h-3.5 w-3.5" />非表示</Button>
          </div>
          {!selectedRoom ? (
            <p className="py-8 text-center text-sm text-muted-foreground">上のソースを選んでください。</p>
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
                    <Badge variant="secondary">{selectedSourceName || post.roomId}</Badge>
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
          {/* 裏方LLM（Groq等）の接続テスト */}
          <AdminLlmTestButton />

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
