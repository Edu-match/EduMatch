"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, CornerDownRight, Link2, Loader2, MessageCircle, Pin, Send } from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { InteropContentCarousel } from "@/components/interop/interop-content-carousel";
import { InteropChatWidget } from "@/components/interop/interop-chat-widget";
import type { InteropThemeMode } from "@/lib/interop-settings";

type AiReply = { body: string; postedAt: string };
type UserReply = { id: string; authorName: string; authorRole: string; body: string; postedAt: string };

type Post = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  isPinned?: boolean;
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

/** サブカテゴリ別ページの掲示板（上＝コンテンツ、下＝投稿欄）。来場者はログイン不要で投稿。
 *  topic を渡すと「トピック別」掲示板になる（投稿・一覧・参考URL・検索コンテンツがトピック単位）。 */
export function InteropBoard({
  sub,
  topic,
  accent,
  themeMode = "auto",
}: {
  sub: { id: string; name: string; description: string; url?: string; categoryId: string; categoryName: string; categorySlug?: string };
  topic?: { id: string; name: string; description: string; url?: string };
  accent: string;
  themeMode?: InteropThemeMode;
}) {
  // interop 直下の「直行サテライト」（最新ニュース／登壇者への質問／ご意見BOX）は
  // トップマップから直接入るので、戻り先はハブではなくトップマップにする。
  const isSatellite = sub.categorySlug === "interop";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const listTopRef = useRef<HTMLDivElement>(null);
  // マップの吹き出しから「投稿を見る」で来たときに該当投稿へスクロール＆ハイライト
  const searchParams = useSearchParams();
  const focusPostId = searchParams.get("post");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/interop/posts?subCategoryId=${sub.id}${topic ? `&topicId=${topic.id}` : ""}`)
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

  const canSubmit = !!name.trim() && !!role.trim() && !!bodyText.trim() && !submitting;

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
        // AIモデレーションで自動非表示 → 投稿者には確認中と伝える（理由は晒さない）
        setError(null);
        setNotice(data.message || "投稿ありがとうございます。内容を確認のうえ公開されます。");
        setTimeout(() => setNotice(null), 5000);
        return;
      }
      setPosts((prev) => [data.post, ...prev]);
      listTopRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(parentId: string) {
    const trimmed = replyBody.trim();
    if (!trimmed || !name.trim() || !role.trim() || replySubmitting) return;
    setReplySubmitting(true);
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
          postBody: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "返信に失敗しました"); return; }
      setReplyBody("");
      setReplyingToId(null);
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

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6">
        {/* 戻る（トピック一覧／大カテゴリ／マップ） */}
        <div className="flex flex-wrap items-center gap-2">
          {topic ? (
            <>
              <Link
                href={`/interop/t/${sub.id}`}
                prefetch={false}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
                style={{ background: `${accent}22`, borderColor: `${accent}66` }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> トピック一覧に戻る
              </Link>
              <Link
                href="/interop"
                prefetch={false}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-white/70 backdrop-blur transition-colors hover:bg-white/12 hover:text-white"
              >
                マップに戻る
              </Link>
            </>
          ) : isSatellite ? (
            // 直行サテライト：トップマップへ直接戻る（/interop は両ドメインで正しく解決される）
            <Link
              href="/interop"
              prefetch={false}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
              style={{ background: `${accent}22`, borderColor: `${accent}66` }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> マップに戻る
            </Link>
          ) : (
            <>
              <Link
                href={`/interop?cat=${sub.categoryId}`}
                prefetch={false}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:brightness-110"
                style={{ background: `${accent}22`, borderColor: `${accent}66` }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {sub.categoryName}に戻る
              </Link>
              <Link
                href="/interop"
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
            background: "rgba(8,11,32,0.72)",
            borderColor: `${accent}44`,
            boxShadow: `0 0 30px ${accent}1f`,
            backdropFilter: "blur(8px)",
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
                return (
                  <li key={p.id} id={`post-${p.id}`} className="scroll-mt-20 rounded-2xl border transition-all duration-500" style={
                    highlightId === p.id
                      ? { borderColor: accent, background: `${accent}26`, boxShadow: `0 0 0 2px ${accent}, 0 0 22px ${accent}66` }
                      : p.isPinned
                        ? { borderColor: `${accent}66`, background: `${accent}14` }
                        : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }
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
                      {/* 返信ボタン（固定/お知らせ投稿は除く） */}
                      {!p.isPinned && (
                        <button
                          type="button"
                          onClick={() => { setReplyingToId(replyingToId === p.id ? null : p.id); setReplyBody(""); }}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-white/70 transition"
                        >
                          <CornerDownRight className="h-3 w-3" />
                          {replyingToId === p.id ? "キャンセル" : `返信する（${(p.userReplies ?? []).length > 0 ? (p.userReplies ?? []).length + "件" : ""}）`}
                        </button>
                      )}
                    </div>

                    {/* ユーザー返信一覧 */}
                    {(p.userReplies ?? []).length > 0 && (
                      <div className="mx-3 mb-2 space-y-2 border-l-2 border-white/10 pl-3">
                        {(p.userReplies ?? []).map((r) => (
                          <div key={r.id}>
                            <div className="flex items-center gap-1.5 text-[10.5px] text-white/50">
                              <span className="font-bold text-white/75">{r.authorName}</span>
                              {r.authorRole && <span className="text-white/35">· {r.authorRole}</span>}
                              <span className="ml-auto">{timeAgo(r.postedAt)}</span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-white/70">{r.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* インライン返信フォーム */}
                    {replyingToId === p.id && (
                      <div className="mx-3 mb-3 space-y-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                        {(!name.trim() || !role.trim()) && (
                          <p className="text-[11px] text-amber-300/80">下のフォームでニックネームと肩書きを入力してから返信できます。</p>
                        )}
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder={`${p.authorName}さんへ返信…`}
                          rows={2}
                          maxLength={500}
                          className="w-full resize-none rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => submitReply(p.id)}
                            disabled={replySubmitting || !name.trim() || !role.trim() || !replyBody.trim()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white transition disabled:opacity-40"
                            style={{ background: accent }}
                          >
                            {replySubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            返信する
                          </button>
                        </div>
                      </div>
                    )}

                    {p.aiReply && (
                      <div
                        className="mx-3 mb-3 rounded-xl px-3.5 py-2.5"
                        style={{
                          background: "rgba(100,140,255,0.09)",
                          borderTop: "1px solid rgba(120,160,255,0.18)",
                        }}
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold text-indigo-300/80">
                          <Bot className="h-3 w-3" /> AIファシリテーター
                          <span className="ml-auto text-white/30 font-normal">{timeAgo(p.aiReply.postedAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75">
                          {p.aiReply.body}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ════ 最下部：投稿欄（固定） ════ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#070a1c]/95 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6">
          {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
          {notice && <p className="mb-2 text-xs text-emerald-300">{notice}</p>}
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
