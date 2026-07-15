"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, ChevronDown, ChevronUp, CornerDownRight, Heart, Link2, Loader2, LogIn, MessageCircle, PenSquare, Pin, Send, X } from "lucide-react";
import { useAuthUser } from "@/components/community/answer-section";
import { formatOrganizationTypeDisplay } from "@/lib/organization-types";
import { getInteropVoterKey } from "@/lib/interop-voter";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { InteropContentCarousel } from "@/components/interop/interop-content-carousel";
import { InteropChatWidget } from "@/components/interop/interop-chat-widget";
import { interopBoardPath } from "@/lib/interop-paths";
import type { InteropThemeMode } from "@/lib/interop-settings";

type AiReply = { body: string; postedAt: string };
type UserReply = { id: string; authorName: string; authorRole: string; body: string; postedAt: string };

type Post = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  isPinned?: boolean;
  likeCount?: number;
  liked?: boolean;
  postedAt: string;
  aiReply?: AiReply | null;
  userReplies?: UserReply[];
};

/** 参考URL → サムネ画像/ドメインを推定 */
function linkPreview(url: string): { img: string | null; domain: string } {
  let domain = url;
  try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* noop */ }
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return { img: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`, domain };
  if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url)) return { img: url, domain };
  return { img: null, domain };
}

function detectSentimentColor(body: string): string {
  if (/課題|問題|困って|難し|大変|壁|不満|不安|できな|なんで|なぜ/.test(body)) return "#9bc4ff";
  if (/提言|すべき|べきで|提案|改善|必要|変えるべき|実現|目指す|したい|増やし|減らし/.test(body)) return "#7de8a0";
  if (/[?？]|どうすれ|どこが|でしょうか|ますか|どんな/.test(body)) return "#f0d888";
  if (/[!！]{2}|絶対|強く思|情熱|使命|変えたい|変えなければ/.test(body)) return "#d4b0ff";
  if (/素晴らし|いいと思|好き|最高|よかった|嬉しい|ありがとう|楽しみ/.test(body)) return "#c0f0d8";
  return "rgba(255,255,255,0.88)";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return `${d}日前`;
}

/** 本文先頭の「@相手名」をメンションとして装飾表示（返信への返信の宛先） */
function renderBodyWithMention(body: string): React.ReactNode {
  const match = body.match(/^@(\S+)\s+([\s\S]*)$/);
  if (!match) return body;
  return (
    <>
      <span className="font-bold text-sky-300">@{match[1]}</span>
      <span> {match[2]}</span>
    </>
  );
}

/** フロストグラス：時間帯背景を透かしつつ本文のコントラストを確保 */
const POST_SURFACE = {
  background: "linear-gradient(145deg, rgba(14,20,52,0.62) 0%, rgba(8,12,36,0.72) 100%)",
  backdropFilter: "blur(16px) saturate(1.15)",
  WebkitBackdropFilter: "blur(16px) saturate(1.15)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
} as const;

/** サブカテゴリ別ページの掲示板（上＝コンテンツ、下＝投稿欄）。来場者はログイン不要で投稿。
 *  topic を渡すと「トピック別」掲示板になる（投稿・一覧・参考URL・検索コンテンツがトピック単位）。 */
export function InteropBoard({
  sub,
  topic,
  accent,
  themeMode = "auto",
  forumStyleForm = false,
}: {
  sub: { id: string; name: string; description: string; url?: string; categoryId: string; categoryName: string; categorySlug?: string };
  topic?: { id: string; name: string; description: string; url?: string };
  accent: string;
  themeMode?: InteropThemeMode;
  forumStyleForm?: boolean;
}) {
  // interop 直下の「直行サテライト」（最新ニュース／登壇者への質問／ご意見BOX）は
  // トップマップから直接入るので、戻り先はハブではなくトップマップにする。
  const isSatellite = sub.categorySlug === "interop";
  const auth = useAuthUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // AIモデレーション：投稿が審査保留になったとき、結果（診断中/公開/非公開/人手審査）を明示する常設カード
  const [reviewPending, setReviewPending] = useState<string | null>(null);
  /** 返信スレッドを展開している投稿ID */
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  /** 開いている返信フォーム（postId + 宛先名。宛先なし＝投稿者宛） */
  const [activeReply, setActiveReply] = useState<{ postId: string; mentionName: string } | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const replyFormRef = useRef<HTMLDivElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  // 固定投稿欄の実高に合わせて下余白を動的に確保（pb-28 固定だと最下部が隠れる）
  const [composePad, setComposePad] = useState(160);
  // マップの吹き出しから「投稿を見る」で来たときに該当投稿へスクロール＆ハイライト
  const searchParams = useSearchParams();
  const focusPostId = searchParams.get("post");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const voterKeyRef = useRef(getInteropVoterKey());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const voter = encodeURIComponent(voterKeyRef.current);
    fetch(`/api/interop/posts?subCategoryId=${sub.id}${topic ? `&topicId=${topic.id}` : ""}&voterKey=${voter}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.posts)) setPosts(d.posts); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sub.id, topic?.id]);

  // 投稿読み込み後に該当投稿へスクロール＆一時ハイライト
  useEffect(() => {
    if (!focusPostId || loading || posts.length === 0) return;
    if (!posts.some((p) => p.id === focusPostId)) return;
    const el = document.getElementById(`post-${focusPostId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(focusPostId);
    const t = setTimeout(() => setHighlightId(null), 2600);
    return () => clearTimeout(t);
  }, [focusPostId, loading, posts]);

  // 名前は入力のたびに保持し、別カテゴリ／別ページでも自動入力する（リロードでも維持）
  useEffect(() => {
    const el = composeRef.current;
    if (!el) return;
    const syncPad = () => setComposePad(el.getBoundingClientRect().height + 16);
    syncPad();
    const ro = new ResizeObserver(syncPad);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function toggleThread(postId: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function openReply(postId: string, mentionName: string, expandThread = false) {
    setActiveReply({ postId, mentionName });
    setReplyBody("");
    if (expandThread) {
      setExpandedThreads((prev) => new Set(prev).add(postId));
    }
  }

  useEffect(() => {
    if (!activeReply) return;
    requestAnimationFrame(() => {
      replyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      replyFormRef.current?.querySelector("textarea")?.focus();
    });
  }, [activeReply]);

  function closeReply() {
    setActiveReply(null);
    setReplyBody("");
  }

  useEffect(() => {
    try {
      const savedName = localStorage.getItem("interop_author_name");
      if (savedName) setName(savedName);
      const savedRole = localStorage.getItem("interop_author_role");
      if (savedRole) setRole(savedRole);
    } catch { /* noop */ }
  }, []);

  const updateName = (value: string) => {
    setName(value);
    try { localStorage.setItem("interop_author_name", value); } catch { /* noop */ }
  };

  const updateRole = (value: string) => {
    setRole(value);
    try { localStorage.setItem("interop_author_role", value); } catch { /* noop */ }
  };

  const canSubmit = forumStyleForm
    ? auth.isLoggedIn && !!bodyText.trim() && !submitting
    : !!name.trim() && !!role.trim() && !!bodyText.trim() && !submitting;

  async function submit() {
    const trimmed = bodyText.trim();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/interop/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCategoryId: sub.id,
          topicId: topic?.id,
          authorName: name.trim(),
          authorRole: role.trim(),
          postBody: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "投稿に失敗しました"); return; }
      setBodyText("");
      if (data.pendingReview || !data.post) {
        // AIモデレーションで自動非表示 → 審査中を常設カードで明示（理由は晒さない）
        setError(null);
        setNotice(null);
        setReviewPending(data.message || "投稿ありがとうございます。AIが内容を確認しています。");
        return;
      }
      setReviewPending(null);
      setPosts((prev) => [data.post, ...prev]);
      listTopRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(postId: string) {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    const wasLiked = target.liked ?? false;
    const prevCount = target.likeCount ?? 0;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !wasLiked, likeCount: Math.max(0, prevCount + (wasLiked ? -1 : 1)) }
          : p,
      ),
    );
    try {
      const res = await fetch("/api/interop/posts/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, voterKey: voterKeyRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "like failed");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked: data.liked, likeCount: data.count } : p,
        ),
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked: wasLiked, likeCount: prevCount } : p,
        ),
      );
    }
  }

  async function submitReply(parentId: string, mentionName: string) {
    const trimmed = replyBody.trim();
    if (!trimmed || !name.trim() || !role.trim() || replySubmitting) return;
    // 返信への返信は本文先頭に「@相手名」を付け、同じスレッド内にフラット表示する
    const mention = mentionName.trim();
    const finalBody = `@${mention} ${trimmed}`;
    setReplySubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/interop/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCategoryId: sub.id,
          topicId: topic?.id,
          parentPostId: parentId,
          authorName: name.trim(),
          authorRole: role.trim(),
          postBody: finalBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "返信に失敗しました"); return; }
      if (data.pendingReview || !data.post) {
        setReviewPending(data.message || "返信ありがとうございます。AIが内容を確認しています。");
        closeReply();
        return;
      }
      closeReply();
      setExpandedThreads((prev) => new Set(prev).add(parentId));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === parentId
            ? { ...p, userReplies: [...(p.userReplies ?? []), { id: data.post.id, authorName: data.post.authorName, authorRole: data.post.authorRole, body: data.post.body, postedAt: data.post.postedAt }] }
            : p
        )
      );
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setReplySubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#070a1c] text-white">
      <InteropBackdrop themeMode={themeMode} />

      <div
        className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pt-4 sm:px-6"
        style={{ paddingBottom: composePad }}
      >
        {/* 戻る（トピック一覧／大カテゴリ／マップ） */}
        <div className="flex flex-wrap items-center gap-2">
          {topic ? (
            <>
              <Link
                href={interopBoardPath(sub.id)}
                prefetch={false}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
                style={{ background: `${accent}22`, borderColor: `${accent}66` }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> トピック一覧に戻る
              </Link>
              <Link
                href="/forum"
                prefetch={false}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-white/70 backdrop-blur transition-colors hover:bg-white/12 hover:text-white"
              >
                マップに戻る
              </Link>
            </>
          ) : isSatellite ? (
            // 直行サテライト：トップマップへ直接戻る（/interop は両ドメインで正しく解決される）
            <Link
              href="/forum"
              prefetch={false}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
              style={{ background: `${accent}22`, borderColor: `${accent}66` }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> マップに戻る
            </Link>
          ) : (
            <>
              <Link
                href={`/forum?cat=${sub.categoryId}`}
                prefetch={false}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
                style={{ background: `${accent}22`, borderColor: `${accent}66` }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {sub.categoryName}に戻る
              </Link>
              <Link
                href="/forum"
                prefetch={false}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-white/70 backdrop-blur transition-colors hover:bg-white/12 hover:text-white"
              >
                マップに戻る
              </Link>
            </>
          )}
        </div>

        {/* ════ 画面上部：コンテンツ ════ */}
        <header
          className="mt-4 rounded-3xl border px-5 py-6"
          style={{
            ...POST_SURFACE,
            borderColor: `${accent}55`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.28), 0 0 24px ${accent}1a, inset 0 1px 0 rgba(255,255,255,0.14)`,
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: accent }}>
            <MessageCircle className="h-3.5 w-3.5" /> {topic ? `${sub.categoryName}｜${sub.name}` : sub.categoryName}
          </div>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{topic ? topic.name : sub.name}</h1>
          {(topic ? topic.description : sub.description) && (
            <p className="mt-2 text-sm leading-relaxed text-white/70">{topic ? topic.description : sub.description}</p>
          )}
        </header>

        {/* ════ 概要下の参考リンク（サムネ）。トピック側URLがあれば優先 ════ */}
        {(topic?.url || sub.url) && (() => {
          const refUrl = (topic?.url || sub.url) as string;
          const { img, domain } = linkPreview(refUrl);
          return (
            <a
              href={refUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-3 block max-w-md overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] transition hover:border-white/25"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d1130]">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/25"><Link2 className="h-10 w-10" /></div>
                )}
                <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: `${accent}cc` }}>参考リンク</span>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm text-white/80">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-white/45" />
                <span className="truncate">{domain}</span>
                <span className="ml-auto shrink-0 text-xs font-bold" style={{ color: accent }}>開く →</span>
              </div>
            </a>
          );
        })()}

        {/* ════ 関連コンテンツ（本体エデュマッチから検索） ════ */}
        <InteropContentCarousel subId={sub.id} topicId={topic?.id} accent={accent} />

        {/* ════ その下：投稿一覧 ════ */}
        <div ref={listTopRef} className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white/80">みんなの投稿</h2>
          <span className="text-xs text-white/40">{posts.length}件</span>
        </div>

        <div className="mt-3 flex-1">
          {loading ? (
            <div className="grid place-items-center py-16 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="grid place-items-center py-16 text-center text-sm text-white/45">
              まだ投稿がありません。<br />最初のひとことを書いてみよう。
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => {
                const sentimentColor = detectSentimentColor(p.body);
                const userReplies = p.userReplies ?? [];
                const replyCount = userReplies.length + (p.aiReply ? 1 : 0);
                const threadOpen = expandedThreads.has(p.id);
                const replyOpen = activeReply?.postId === p.id;
                return (
                  <li key={p.id} id={`post-${p.id}`} className="scroll-mt-20 rounded-2xl border transition-all duration-500" style={
                    highlightId === p.id
                      ? { ...POST_SURFACE, borderColor: accent, background: `linear-gradient(145deg, rgba(14,20,52,0.78) 0%, ${accent}28 100%)`, boxShadow: `0 0 0 2px ${accent}, 0 8px 28px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.14)` }
                      : p.isPinned
                        ? { ...POST_SURFACE, borderColor: `${accent}55`, background: `linear-gradient(145deg, rgba(14,20,52,0.68) 0%, ${accent}1e 100%)` }
                        : { ...POST_SURFACE, borderColor: "rgba(255,255,255,0.16)" }
                  }>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        {p.isPinned && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ background: `${accent}33`, color: "#fff" }}
                          >
                            <Pin className="h-2.5 w-2.5" /> お知らせ
                          </span>
                        )}
                        <span className="font-bold text-white/85">{p.authorName}</span>
                        {p.authorRole && <span className="text-white/40">· {p.authorRole}</span>}
                        <span className="ml-auto shrink-0">{timeAgo(p.postedAt)}</span>
                      </div>
                      <p
                        className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed"
                        style={{ color: sentimentColor }}
                      >
                        {p.body}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleLike(p.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] transition ${
                            p.liked ? "text-pink-400" : "text-white/40 hover:text-pink-300"
                          }`}
                          aria-pressed={p.liked}
                          aria-label={p.liked ? "いいねを取り消す" : "いいねする"}
                        >
                          <Heart className={`h-3.5 w-3.5 ${p.liked ? "fill-pink-400" : ""}`} />
                          {(p.likeCount ?? 0) > 0 ? p.likeCount : "いいね"}
                        </button>
                        {!p.isPinned && (
                          <button
                            type="button"
                            onClick={() => (replyOpen ? closeReply() : openReply(p.id, p.authorName))}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                              replyOpen
                                ? "bg-white/12 text-white"
                                : "text-white/55 hover:bg-white/8 hover:text-white/85"
                            }`}
                          >
                            <CornerDownRight className="h-3 w-3" />
                            {replyOpen ? "返信をやめる" : "返信する"}
                          </button>
                        )}
                        {replyCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleThread(p.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/55 transition hover:border-white/25 hover:text-white/80"
                          >
                            {threadOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            返信 {replyCount}件{threadOpen ? "を閉じる" : "を見る"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 返信フォーム（開いたときだけ表示・投稿直下に配置） */}
                    {replyOpen && activeReply && (
                      <div
                        ref={replyFormRef}
                        className="mx-3 mb-3 space-y-2 rounded-xl border px-3 py-2.5"
                        style={{ ...POST_SURFACE, borderColor: `${accent}55` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1 text-xs text-sky-300">
                            <CornerDownRight className="h-3.5 w-3.5" />
                            <span className="font-bold">@{activeReply.mentionName}</span>
                            <span className="text-white/55">さんへ返信</span>
                          </p>
                          <button
                            type="button"
                            onClick={closeReply}
                            className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white/70"
                            aria-label="返信を閉じる"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {(!name.trim() || !role.trim()) && (
                          <div className="space-y-2 rounded-lg border border-amber-400/25 bg-amber-950/20 px-2.5 py-2">
                            <p className="text-[11px] text-amber-200/90">返信にはニックネームと肩書きが必要です。</p>
                            <div className="flex gap-2">
                              <input
                                value={name}
                                onChange={(e) => updateName(e.target.value)}
                                placeholder="ニックネーム"
                                maxLength={40}
                                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                              />
                              <input
                                value={role}
                                onChange={(e) => updateRole(e.target.value)}
                                placeholder="肩書き"
                                maxLength={60}
                                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder={`@${activeReply.mentionName} さんへ返信…`}
                          rows={3}
                          maxLength={500}
                          className="w-full resize-none rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={closeReply}
                            className="inline-flex h-8 items-center rounded-lg px-3 text-xs text-white/55 transition hover:text-white/80"
                          >
                            キャンセル
                          </button>
                          <button
                            type="button"
                            onClick={() => submitReply(p.id, activeReply.mentionName)}
                            disabled={replySubmitting || !name.trim() || !role.trim() || !replyBody.trim()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white transition disabled:opacity-40"
                            style={{ background: accent }}
                          >
                            {replySubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            返信を送る
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 返信スレッド（デフォルト折りたたみ） */}
                    {replyCount > 0 && threadOpen && (
                      <div
                        className="mx-3 mb-3 space-y-2 rounded-xl border border-white/10 px-3 py-2.5"
                        style={{
                          background: "rgba(6,10,28,0.45)",
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                        }}
                      >
                        {p.aiReply && (
                          <div className="rounded-lg border border-indigo-400/25 bg-indigo-950/30 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-indigo-200/90">
                              <Bot className="h-3 w-3" />
                              <span className="font-bold">AIファシリテーター</span>
                              <span className="ml-auto text-white/40">{timeAgo(p.aiReply.postedAt)}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/88">
                              {p.aiReply.body}
                            </p>
                            {!p.isPinned && (
                              <button
                                type="button"
                                onClick={() => openReply(p.id, "AIファシリテーター", true)}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-bold text-white/55 transition hover:bg-white/12 hover:text-white/85"
                              >
                                <CornerDownRight className="h-2.5 w-2.5" />
                                返信する
                              </button>
                            )}
                          </div>
                        )}
                        {userReplies.map((r) => (
                          <div key={r.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                            <div className="flex items-center gap-1.5 text-[10.5px] text-white/55">
                              <span className="font-bold text-white/85">{r.authorName}</span>
                              {r.authorRole && <span className="text-white/45">· {r.authorRole}</span>}
                              <span className="ml-auto">{timeAgo(r.postedAt)}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/82">
                              {renderBodyWithMention(r.body)}
                            </p>
                            {!p.isPinned && (
                              <button
                                type="button"
                                onClick={() => openReply(p.id, r.authorName, true)}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-bold text-white/55 transition hover:bg-white/12 hover:text-white/85"
                              >
                                <CornerDownRight className="h-2.5 w-2.5" />
                                {r.authorName}さんに返信
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ════ 最下部：投稿欄（固定・常時表示） ════ */}
      <div
        ref={composeRef}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#070a1c]/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6">
          {reviewPending && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-200">AIが内容を診断中です</p>
                <p className="text-amber-100/80">{reviewPending}</p>
                <p className="mt-0.5 text-amber-100/60">問題なければ自動で公開されます。規約に反する場合は公開されないことがあり、判断が難しい内容は運営が確認します。</p>
              </div>
              <button type="button" onClick={() => setReviewPending(null)} className="shrink-0 rounded-full p-0.5 text-amber-200/70 hover:text-amber-100" aria-label="閉じる"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
          {notice && <p className="mb-2 text-xs text-emerald-300">{notice}</p>}
          {forumStyleForm ? (
            <ForumStyleComposeArea
              auth={auth}
              bodyText={bodyText}
              setBodyText={setBodyText}
              submitting={submitting}
              accent={accent}
              onSubmit={() => {
                if (!auth.isLoggedIn || !bodyText.trim()) return;
                const profileRole = auth.organizationType?.trim()
                  ? formatOrganizationTypeDisplay(auth.organizationType, auth.organizationTypeOther ?? undefined)
                  : "一般";
                setName(auth.name);
                setRole(profileRole);
                submit();
              }}
            />
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => updateName(e.target.value)}
                    placeholder="ニックネーム（必須）"
                    maxLength={40}
                    className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                  />
                  <input
                    value={role}
                    onChange={(e) => updateRole(e.target.value)}
                    placeholder="肩書き（必須）"
                    maxLength={60}
                    className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                  />
                </div>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
                  placeholder="ひとこと書く…"
                  rows={2}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-bold text-white transition disabled:opacity-40"
                style={{ background: accent }}
                aria-label="投稿する"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* どのページでもいつでも質問できるAIチャット（下部に投稿バーがあるので少し上げる）。
          今見ているページ（トピック・概要）に加え、ページ内の投稿・返信もアタッチして渡す */}
      <InteropChatWidget
        mobileRaise
        context={
          topic
            ? `${sub.categoryName}｜${sub.name}｜トピック「${topic.name}」${topic.description ? `（${topic.description}）` : ""}`
            : `${sub.categoryName}｜${sub.name}${sub.description ? `（${sub.description}）` : ""}`
        }
        contextDetail={serializePostsForAi(posts)}
      />
    </main>
  );
}

function ForumStyleComposeArea({
  auth,
  bodyText,
  setBodyText,
  submitting,
  accent,
  onSubmit,
}: {
  auth: ReturnType<typeof useAuthUser>;
  bodyText: string;
  setBodyText: (v: string) => void;
  submitting: boolean;
  accent: string;
  onSubmit: () => void;
}) {
  const MAX_BODY = 3000;
  const remaining = MAX_BODY - bodyText.length;
  const canSubmit = auth.isLoggedIn && bodyText.trim().length > 0 && bodyText.length <= MAX_BODY && !submitting;

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  if (!auth.isLoggedIn) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white/90">投稿するにはログインしてください</p>
          <p className="mt-1 text-xs text-white/55">会員限定の投稿機能です。</p>
        </div>
        <a
          href="/auth/login"
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: accent }}
        >
          <LogIn className="h-4 w-4" />ログインする
        </a>
      </div>
    );
  }

  const profileRole = auth.organizationType?.trim()
    ? formatOrganizationTypeDisplay(auth.organizationType, auth.organizationTypeOther ?? undefined)
    : "一般";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold text-white">
          {(auth.name || "?")[0]}
        </div>
        <span className="text-xs font-medium text-white/85">{auth.name}</span>
        <span className="text-white/30">·</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/65">{profileRole}</span>
      </div>
      <textarea
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit(); }}
        placeholder="あなたの意見や経験を書いてください…"
        rows={4}
        maxLength={MAX_BODY + 50}
        className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm leading-7 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
      />
      <div className="flex items-center justify-end gap-3">
        <span className={`text-[11px] tabular-nums ${remaining < 0 ? "text-rose-400 font-semibold" : remaining < 50 ? "text-amber-300" : "text-white/40"}`}>
          {remaining}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition disabled:opacity-40 hover:opacity-90"
          style={{ background: accent }}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenSquare className="h-3.5 w-3.5" />}
          投稿する
        </button>
      </div>
    </div>
  );
}

/** このページの投稿と、その返信（AI・参加者）をAIチャットに渡すテキストに整形。
 *  新しい順で最大20件・各本文は長すぎないよう丸める。 */
function serializePostsForAi(posts: Post[]): string {
  if (posts.length === 0) return "";
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
  const blocks = posts.slice(0, 20).map((p, i) => {
    const head = `${i + 1}. ${p.authorName}${p.authorRole ? `（${p.authorRole}）` : ""}${p.isPinned ? "［お知らせ］" : ""}: ${clip(p.body, 280)}`;
    const lines = [head];
    if (p.aiReply) lines.push(`   └ AIファシリテーター: ${clip(p.aiReply.body, 200)}`);
    for (const r of p.userReplies ?? []) {
      lines.push(`   └ ${r.authorName}${r.authorRole ? `（${r.authorRole}）` : ""}: ${clip(r.body, 200)}`);
    }
    return lines.join("\n");
  });
  return `このページに投稿されている内容（新しい順・最大20件、返信も含む）:\n${blocks.join("\n")}`;
}
