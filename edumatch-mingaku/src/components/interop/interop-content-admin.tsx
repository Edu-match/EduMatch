"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  ListTree,
  Loader2,
  MessageSquare,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INTEROP_CONTENT_KINDS as CONTENT_KIND_OPTIONS } from "@/lib/interop-content";

const darkInput = "bg-white/[0.06] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-white/30";

function linkPreview(url: string): { thumb: string | null; domain: string } {
  try {
    const u = new URL(url);
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) return { thumb: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`, domain: "youtube.com" };
    if (/\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(u.pathname)) return { thumb: url, domain: u.hostname };
    return { thumb: null, domain: u.hostname };
  } catch {
    return { thumb: null, domain: "" };
  }
}

function UrlPreview({ url }: { url: string }) {
  const { thumb, domain } = linkPreview(url);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-2 transition hover:bg-white/[0.08]">
      {thumb ? (
        <img src={thumb} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.06] text-white/25">
          <ExternalLink className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-sky-300">{domain}</p>
        <p className="truncate text-[10px] text-white/40">{url}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/25" />
    </a>
  );
}

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  isPrimary: boolean;
  sortOrder: number;
  isActive: boolean;
};
type SubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  url?: string;
  linkUrl?: string;
  sortOrder: number;
  isActive: boolean;
  contentKinds?: string[];
  contentQuery?: string;
};
type Post = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  isPinned: boolean;
  isHidden: boolean;
  postedAt: string;
  aiReply?: { id: string; body: string; postedAt: string; isHidden?: boolean } | null;
  userReplies?: Array<{ id: string; authorName: string; authorRole: string; body: string; postedAt: string; isHidden?: boolean }>;
};
type BoardTopic = {
  id: string;
  subCategoryId: string;
  name: string;
  description: string;
  url: string;
  contentKinds: string[];
  contentQuery: string;
  sortOrder: number;
  isActive: boolean;
};

/** トップマップから直行できる3サテライト（slug固定・管理画面からワンクリック追加可） */
const SATELLITE_DEFS = [
  { slug: "interop-latest-news", name: "最新ニュース", description: "運営・登壇者からの最新ニュースとお知らせ。", hints: ["最新ニュース", "ニュース"], sortOrder: 1 },
  { slug: "interop-speaker-qa", name: "登壇者への質問", description: "登壇者・出展者への質問を投稿できます。", hints: ["登壇者への質問", "登壇", "質問"], sortOrder: 2 },
  { slug: "interop-opinion-box", name: "ご意見BOX", description: "教育とAIについて、ご意見・ご感想を自由にどうぞ。", hints: ["ご意見BOX", "ご意見", "意見"], sortOrder: 3 },
];

function isSatelliteSub(s: SubCategory): boolean {
  return SATELLITE_DEFS.some((d) => s.slug === d.slug || d.hints.some((h) => s.name.includes(h)));
}

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function InteropContentAdmin() {
  // 中心インタロップ直下のサブカテゴリを管理する。
  // 3サテライト（最新ニュース／登壇者への質問／ご意見BOX）は直下に、
  // それ以外は「インタロップ」階層の下にまとめて表示する。
  const [interopCatId, setInteropCatId] = useState<string | null>(null);
  const [sats, setSats] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openInterop, setOpenInterop] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    if (ok) setTimeout(() => setMsg(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api("/api/interop/categories?all=true");
    const cats: Category[] = data.categories ?? [];
    const interop = cats.find((c) => c.slug === "interop") ?? null;
    setInteropCatId(interop?.id ?? null);
    if (interop) {
      const { data: d } = await api(`/api/interop/sub-categories?all=true&categoryId=${interop.id}`);
      setSats((d.subCategories ?? []) as SubCategory[]);
    } else {
      setSats([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const satelliteSubs = sats.filter(isSatelliteSub);
  const interopSubs = sats.filter((s) => !isSatelliteSub(s));

  return (
    <div className="space-y-4">
      {msg && (
        <p className={`sticky top-2 z-10 rounded-xl border px-4 py-2 text-sm font-medium ${msg.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
          {msg.text}
        </p>
      )}

      {/* 構造ガイド */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-white/70">
          <ListTree className="h-3.5 w-3.5" /> 階層：ページ（掲示板） → トピック → 投稿
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
          各ページを開くと「<span className="text-white/65">トピック</span>・<span className="text-white/65">参考リンク</span>・<span className="text-white/65">検索コンテンツ</span>・<span className="text-white/65">投稿</span>」を管理できます。
          トピックを1件でも設定すると、来場者は「トピック選択 → 投稿ページ」の順に進みます（未設定なら直接投稿ページ）。
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
      ) : !interopCatId ? (
        <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-xs text-white/40">
          「interop」カテゴリが見つかりません。SQLマイグレーション／シードを実行してください。
        </p>
      ) : (
        <div className="space-y-4">
          {/* ① サテライト（トップマップから直行する3ページ） */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-amber-400/20 text-[11px] font-black text-amber-300">★</span>
              <h3 className="text-sm font-bold text-white/85">サテライト</h3>
              <span className="text-[11px] text-white/40">トップマップから直行（最新ニュース／登壇者への質問／ご意見BOX）</span>
            </div>
            {satelliteSubs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/12 px-3 py-4 text-center text-[11px] text-white/35">サテライトページが見つかりません。下のボタンから追加できます。</p>
            ) : (
              <ul className="space-y-1.5">
                {satelliteSubs.map((s) => (
                  <SubRow key={s.id} sub={s} onChanged={load} onMsg={flash} />
                ))}
              </ul>
            )}
            <AddSatelliteForm categoryId={interopCatId} existing={sats} onAdded={load} onMsg={flash} />
          </section>

          {/* ② インタロップ配下のページ */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setOpenInterop((v) => !v)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              {openInterop ? <ChevronDown className="h-4 w-4 text-white/60" /> : <ChevronRight className="h-4 w-4 text-white/60" />}
              <span className="grid h-5 w-5 place-items-center rounded-md bg-indigo-400/20 text-[11px] font-black text-indigo-300">＃</span>
              <span className="text-sm font-bold text-white/85">インタロップ配下のページ</span>
              <span className="text-[11px] font-normal text-white/40">{interopSubs.length}件</span>
            </button>
            {openInterop && (
              <div className="space-y-2 border-t border-white/10 p-3">
                {interopSubs.length === 0 ? (
                  <p className="text-xs text-white/40">ページはまだありません。下のフォームから追加できます。</p>
                ) : (
                  <ul className="space-y-1.5">
                    {interopSubs.map((s) => (
                      <SubRow key={s.id} sub={s} onChanged={load} onMsg={flash} />
                    ))}
                  </ul>
                )}
                <AddSubForm categoryId={interopCatId} count={sats.length} onAdded={load} onMsg={flash} />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}


/* ─────────── サブカテゴリ行 ─────────── */
function SubRow({ sub, onChanged, onMsg }: { sub: SubCategory; onChanged: () => void; onMsg: (t: string, ok: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [name, setName] = useState(sub.name);
  const [desc, setDesc] = useState(sub.description);
  const [url, setUrl] = useState(sub.url ?? "");
  const [linkUrl, setLinkUrl] = useState(sub.linkUrl ?? "");
  const [kinds, setKinds] = useState<string[]>(sub.contentKinds ?? []);
  const [query, setQuery] = useState(sub.contentQuery ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { ok } = await api(`/api/interop/sub-categories/${sub.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc, url, linkUrl, contentKinds: kinds, contentQuery: query }),
    });
    setBusy(false);
    if (ok) { onMsg("サブカテゴリを更新しました。", true); setEditing(false); onChanged(); } else onMsg("更新に失敗しました。", false);
  };
  const remove = async () => {
    if (!confirm(`「${sub.name}」と投稿をすべて削除しますか？`)) return;
    const { ok } = await api(`/api/interop/sub-categories/${sub.id}`, { method: "DELETE" });
    if (ok) { onMsg("削除しました。", true); onChanged(); } else onMsg("削除に失敗しました。", false);
  };
  const toggleActive = async () => {
    const { ok } = await api(`/api/interop/sub-categories/${sub.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sub.isActive }),
    });
    if (ok) onChanged(); else onMsg("更新に失敗しました。", false);
  };

  const pill = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
      active
        ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
        : "border-white/12 bg-white/[0.04] text-white/55 hover:bg-white/[0.1] hover:text-white/85"
    }`;

  return (
    <li className={`rounded-lg border bg-white/[0.04] overflow-hidden ${sub.isActive ? "border-white/10" : "border-white/10 opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2 text-sm">
        <span className="flex-1 font-medium text-white/90">
          {sub.name}
          {!sub.isActive && <span className="ml-1.5 rounded bg-white/10 px-1.5 text-[10px] font-normal text-white/45">非公開</span>}
          {sub.linkUrl?.trim() && <span className="ml-1.5 rounded bg-sky-400/15 px-1.5 text-[10px] font-normal text-sky-200">リンク遷移</span>}
          {(sub.contentKinds?.length ?? 0) > 0 && <span className="ml-1.5 rounded bg-emerald-400/15 px-1.5 text-[10px] font-normal text-emerald-200">検索{sub.contentKinds!.length}</span>}
        </span>
        <button type="button" onClick={() => setShowTopics((v) => !v)} className={pill(showTopics)} title="トピックを管理（設定すると投稿前に選択画面が出ます）">
          <ListTree className="h-3.5 w-3.5" /> トピック
        </button>
        <button type="button" onClick={() => setShowPosts((v) => !v)} className={pill(showPosts)} title="投稿・記事を管理">
          <MessageSquare className="h-3.5 w-3.5" /> 投稿
        </button>
        <button type="button" onClick={() => setEditing((v) => !v)} className={pill(editing)} title="このページの編集（名前・リンク・検索）">
          <Pencil className="h-3.5 w-3.5" /> 編集
        </button>
        <button type="button" onClick={toggleActive} className="grid h-7 w-7 place-items-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white" title={sub.isActive ? "非公開にする" : "公開する"}>
          {sub.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={remove} className="grid h-7 w-7 place-items-center rounded-md text-white/40 transition hover:bg-red-400/10 hover:text-red-300" title="削除"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {editing && (
        <div className="space-y-2 border-t border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs"><span className="mb-1 block text-white/55">名前</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} className={`h-8 w-36 text-xs ${darkInput}`} /></label>
            <label className="text-xs"><span className="mb-1 block text-white/55">説明</span>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} className={`h-8 w-56 text-xs ${darkInput}`} /></label>
          </div>
          <label className="block text-xs"><span className="mb-1 block text-white/55">参考リンクURL（概要下にサムネ表示）</span>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className={`h-8 w-full text-xs ${darkInput}`} /></label>
          <label className="block text-xs">
            <span className="mb-1 block text-white/55">
              タップ時の遷移先（空＝掲示板へ／URL設定＝外部リンクへ）
            </span>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://...（設定すると掲示板ではなくリンクに遷移）" className={`h-8 w-full text-xs ${darkInput}`} /></label>
          <ContentSearchPanel subId={sub.id}
            kinds={kinds} query={query}
            onKindsChange={setKinds} onQueryChange={setQuery}
          />
          <Button size="sm" onClick={save} disabled={busy} className="h-8 gap-1 text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}保存</Button>
        </div>
      )}
      {showTopics && <TopicManager subId={sub.id} onMsg={onMsg} />}
      {showPosts && <PostManager subId={sub.id} onMsg={onMsg} />}
    </li>
  );
}

/* ─────────── トピックマネージャ ───────────
 * サブカテゴリ配下のトピック管理。1件でも設定すると来場者は
 * 「トピック選択 → 投稿ページ」の順になる。トピック単位で
 * 参考URL・検索コンテンツ（kinds/query）を上書きできる。 */
function TopicManager({ subId, onMsg }: { subId: string; onMsg: (t: string, ok: boolean) => void }) {
  const [topics, setTopics] = useState<BoardTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [autoEditId, setAutoEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api(`/api/interop/board-topics?subCategoryId=${subId}&all=true`);
    setTopics((data.topics ?? []) as BoardTopic[]);
    setLoading(false);
  }, [subId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const { ok, data } = await api("/api/interop/board-topics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subCategoryId: subId,
        name: newName,
        description: newDesc,
        url: newUrl,
        sortOrder: topics.length,
      }),
    });
    setBusy(false);
    if (ok) {
      onMsg(`トピック「${newName}」を追加しました。`, true);
      setNewName(""); setNewDesc(""); setNewUrl("");
      setAutoEditId(data.topic?.id ?? null);
      load();
    } else onMsg("トピックの追加に失敗しました。", false);
  };

  return (
    <div className="space-y-2 border-t border-white/10 bg-white/[0.04] px-3 py-3">
      <p className="text-xs font-semibold text-white/80">
        トピック
        <span className="ml-1.5 font-normal text-white/40">
          1件でも設定すると、来場者は「トピック選択 → 投稿ページ」の順になります
        </span>
      </p>
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-white/40" /></div>
      ) : topics.length === 0 ? (
        <p className="text-xs text-white/40">トピックはまだありません（来場者は直接投稿ページに入ります）。</p>
      ) : (
        <ul className="space-y-1.5">
          {topics.map((t) => (
            <TopicRow key={t.id} topic={t} subId={subId} autoEdit={autoEditId === t.id} onChanged={load} onMsg={onMsg} />
          ))}
        </ul>
      )}

      {/* 新規追加フォーム：名前・説明・URLを一度に入力可能 */}
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 space-y-2">
        <p className="text-[11px] font-semibold text-white/60">トピックを追加</p>
        <div className="flex flex-wrap gap-2">
          <label className="flex-1 min-w-[120px] text-xs">
            <span className="mb-1 block text-white/55">名前 *</span>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例：生成AIと授業づくり" className={`h-8 text-xs ${darkInput}`} />
          </label>
          <label className="flex-1 min-w-[120px] text-xs">
            <span className="mb-1 block text-white/55">説明（任意）</span>
            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="短い説明" className={`h-8 text-xs ${darkInput}`} />
          </label>
        </div>
        <label className="block text-xs">
          <span className="mb-1 block text-white/55">参考リンクURL（任意）</span>
          <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." className={`h-8 w-full text-xs ${darkInput}`} />
        </label>
        {newUrl.trim() && <UrlPreview url={newUrl.trim()} />}
        <div className="flex justify-end">
          <button
            type="button" onClick={add} disabled={busy || !newName.trim()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-indigo-400/40 bg-indigo-500/20 px-3 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 追加
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── コンテンツ検索パネル ─────────── */
type ContentItem = { id: string; title: string; description: string; thumbnailUrl: string | null; href: string; kindLabel: string };

function ContentSearchPanel({ subId, topicId, kinds, query, onKindsChange, onQueryChange }: {
  subId: string; topicId?: string;
  kinds: string[]; query: string;
  onKindsChange: (k: string[]) => void; onQueryChange: (q: string) => void;
}) {
  const [results, setResults] = useState<ContentItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const search = async () => {
    if (kinds.length === 0) return;
    setSearching(true);
    setSearched(true);
    const params = new URLSearchParams({ kinds: kinds.join(","), q: query });
    const { data } = await api(`/api/interop/content/search?${params}`);
    setResults(data.items ?? []);
    setSearching(false);
  };

  // トピック保存済みの実際の表示内容を確認
  const preview = async () => {
    setSearching(true);
    setSearched(true);
    const params = new URLSearchParams({ subCategoryId: subId });
    if (topicId) params.set("topicId", topicId);
    const { data } = await api(`/api/interop/content?${params}`);
    setResults(data.items ?? []);
    setSearching(false);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
      <button type="button" onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[11px] font-semibold text-white/55 hover:text-white/80">
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        AIUEO BASE コンテンツ検索・設定
        {kinds.length > 0 && <span className="rounded-full bg-indigo-400/20 px-1.5 text-[10px] text-indigo-300">{kinds.length}種別</span>}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="mb-1 text-[10px] text-white/45">表示する種別を選択</p>
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_KIND_OPTIONS.map((k) => {
                const on = kinds.includes(k.value);
                return (
                  <button key={k.value} type="button"
                    onClick={() => onKindsChange(on ? kinds.filter((x) => x !== k.value) : [...kinds, k.value])}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${on ? "border-indigo-400 bg-indigo-400/20 text-indigo-300" : "border-white/15 text-white/40 hover:text-white/70"}`}>
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block text-[10px]">
            <span className="mb-1 block text-white/45">検索キーワード（空ならサブカテゴリ名＋トピック名）</span>
            <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="例：探究 AI" className={`h-8 w-64 text-xs ${darkInput}`} />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={search} disabled={searching || kinds.length === 0}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-white/20 bg-white/[0.08] px-2.5 text-[11px] font-semibold text-white/80 transition hover:bg-white/[0.14] disabled:opacity-40">
              {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              キーワード検索
            </button>
            {topicId && (
              <button type="button" onClick={preview} disabled={searching}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-sky-400/30 bg-sky-400/10 px-2.5 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-40">
                保存済み設定でプレビュー
              </button>
            )}
          </div>
          {searched && (
            <div>
              {searching ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-white/40" /></div>
              ) : results.length === 0 ? (
                <p className="text-[11px] text-white/40">該当するコンテンツが見つかりませんでした。</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {results.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-xs">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-white/[0.06] text-white/20 text-[9px]">{item.kindLabel}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white/85">{item.title}</p>
                        <p className="truncate text-[10px] text-white/40">{item.description}</p>
                        <span className="rounded-full bg-white/10 px-1.5 text-[9px] text-white/50">{item.kindLabel}</span>
                      </div>
                      <a href={item.href} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 rounded p-1 text-white/30 hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic, subId, autoEdit = false, onChanged, onMsg }: {
  topic: BoardTopic; subId: string; autoEdit?: boolean; onChanged: () => void; onMsg: (t: string, ok: boolean) => void;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [name, setName] = useState(topic.name);
  const [desc, setDesc] = useState(topic.description);
  const [url, setUrl] = useState(topic.url);
  const [kinds, setKinds] = useState<string[]>(topic.contentKinds ?? []);
  const [query, setQuery] = useState(topic.contentQuery ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { ok } = await api(`/api/interop/board-topics/${topic.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc, url, contentKinds: kinds, contentQuery: query }),
    });
    setBusy(false);
    if (ok) { onMsg("トピックを更新しました。", true); setEditing(false); onChanged(); }
    else onMsg("更新に失敗しました。", false);
  };
  const toggleActive = async () => {
    const { ok } = await api(`/api/interop/board-topics/${topic.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !topic.isActive }),
    });
    if (ok) onChanged(); else onMsg("更新に失敗しました。", false);
  };
  const remove = async () => {
    if (!confirm(`トピック「${topic.name}」を削除しますか？（投稿は残り、トピックなし扱いになります）`)) return;
    const { ok } = await api(`/api/interop/board-topics/${topic.id}`, { method: "DELETE" });
    if (ok) { onMsg("削除しました。", true); onChanged(); } else onMsg("削除に失敗しました。", false);
  };

  return (
    <li className={`rounded-lg border border-white/10 bg-white/[0.05] overflow-hidden ${topic.isActive ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
        <span className="flex-1 font-semibold text-white/90">{topic.name}</span>
        {!topic.isActive && <span className="rounded bg-white/10 px-1.5 text-[10px] text-white/45">非表示</span>}
        {(topic.url || (topic.contentKinds?.length ?? 0) > 0) && (
          <span className="rounded bg-sky-400/15 px-1.5 text-[10px] text-sky-200">設定あり</span>
        )}
        <button type="button" onClick={() => setEditing((v) => !v)} className="rounded p-0.5 text-white/40 hover:text-white" title="編集"><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={toggleActive} className="rounded p-0.5 text-white/40 hover:text-white" title={topic.isActive ? "非表示にする" : "表示する"}>
          {topic.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={remove} className="rounded p-0.5 text-white/40 hover:text-red-300" title="削除"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {editing && (
        <div className="space-y-2 border-t border-white/10 bg-white/[0.04] px-2.5 py-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs"><span className="mb-1 block text-white/55">名前</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} className={`h-8 w-44 text-xs ${darkInput}`} /></label>
            <label className="flex-1 text-xs"><span className="mb-1 block text-white/55">説明（任意）</span>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} className={`h-8 w-full text-xs ${darkInput}`} /></label>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs"><span className="mb-1 block text-white/55">参考リンクURL（概要下にサムネ表示・サブカテゴリ設定より優先）</span>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className={`h-8 w-full text-xs ${darkInput}`} /></label>
            {url.trim() && <UrlPreview url={url.trim()} />}
          </div>
          <ContentSearchPanel subId={subId} topicId={topic.id}
            kinds={kinds} query={query}
            onKindsChange={setKinds} onQueryChange={setQuery}
          />
          <Button size="sm" onClick={save} disabled={busy} className="h-8 gap-1 text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}保存</Button>
        </div>
      )}
    </li>
  );
}

/* ─────────── サテライト追加（固定slug・トップマップ直行） ─────────── */
function AddSatelliteForm({ categoryId, existing, onAdded, onMsg }: {
  categoryId: string;
  existing: SubCategory[];
  onAdded: () => void;
  onMsg: (t: string, ok: boolean) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const missing = SATELLITE_DEFS.filter((d) => !existing.some((s) => s.slug === d.slug || d.hints.some((h) => s.name.includes(h))));

  const addPreset = async (def: (typeof SATELLITE_DEFS)[number]) => {
    setBusy(def.slug);
    const { ok, data } = await api("/api/interop/sub-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        name: def.name,
        description: def.description,
        slug: def.slug,
        sortOrder: def.sortOrder,
      }),
    });
    setBusy(null);
    if (ok) { onMsg(`サテライト「${def.name}」を追加しました。`, true); onAdded(); }
    else onMsg(data.error || "追加に失敗しました。", false);
  };

  if (missing.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-dashed border-amber-400/30 bg-amber-400/[0.05] p-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-200/80">
        <Plus className="h-3.5 w-3.5" /> サテライトを追加
      </p>
      <div className="flex flex-wrap gap-2">
        {missing.map((d) => (
          <button
            key={d.slug}
            type="button"
            onClick={() => addPreset(d)}
            disabled={busy !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-500/20 px-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === d.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {d.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── サブカテゴリ追加 ─────────── */
function AddSubForm({ categoryId, count, onAdded, onMsg }: { categoryId: string; count: number; onAdded: () => void; onMsg: (t: string, ok: boolean) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { ok } = await api("/api/interop/sub-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, name, description: desc, sortOrder: count }),
    });
    setBusy(false);
    if (ok) { onMsg(`ページ「${name}」を追加しました。`, true); setName(""); setDesc(""); onAdded(); }
    else onMsg("追加に失敗しました。", false);
  };
  return (
    <div className="mt-1 rounded-lg border border-dashed border-indigo-400/30 bg-indigo-400/[0.05] p-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-200/80">
        <Plus className="h-3.5 w-3.5" /> ページ（掲示板）を追加
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs"><span className="mb-1 block text-white/55">ページ名</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="例：タイムテーブル" className={`h-8 w-40 text-xs ${darkInput}`} /></label>
        <label className="text-xs"><span className="mb-1 block text-white/55">説明（任意）</span>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="任意" className={`h-8 w-48 text-xs ${darkInput}`} /></label>
        <button
          type="button" onClick={add} disabled={busy || !name.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-indigo-400/40 bg-indigo-500/25 px-3 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 追加
        </button>
      </div>
    </div>
  );
}

/* ─────────── 投稿・記事マネージャ ─────────── */
function PostManager({ subId, onMsg }: { subId: string; onMsg: (t: string, ok: boolean) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [articleTitle, setArticleTitle] = useState("運営からのお知らせ");
  const [articleBody, setArticleBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api(`/api/interop/posts?subCategoryId=${subId}&includeHidden=true`);
    setPosts(data.posts ?? []);
    setLoading(false);
  }, [subId]);
  useEffect(() => { load(); }, [load]);

  const postArticle = async () => {
    if (!articleBody.trim()) return;
    setPosting(true);
    const { ok } = await api("/api/interop/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subCategoryId: subId, authorName: articleTitle.trim() || "運営", authorRole: "運営", postBody: articleBody, isPinned: true }),
    });
    setPosting(false);
    if (ok) { onMsg("記事を投稿しました。", true); setArticleBody(""); load(); } else onMsg("投稿に失敗しました。", false);
  };
  const patch = async (id: string, payload: Record<string, unknown>) => {
    const { ok } = await api(`/api/interop/posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (ok) load(); else onMsg("更新に失敗しました。", false);
  };
  const remove = async (id: string) => {
    if (!confirm("この投稿を削除しますか？")) return;
    const { ok } = await api(`/api/interop/posts/${id}`, { method: "DELETE" });
    if (ok) { onMsg("削除しました。", true); load(); } else onMsg("削除に失敗しました。", false);
  };
  const bulkSetHidden = async (isHidden: boolean) => {
    const label = isHidden ? "すべて非表示" : "すべて表示";
    if (!confirm(`このページの投稿・返信・AI返信を${label}にしますか？`)) return;
    setBulkBusy(true);
    const { ok, data } = await api("/api/interop/posts/bulk-hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subCategoryId: subId, isHidden }),
    });
    setBulkBusy(false);
    if (ok) { onMsg(`${data.updated ?? 0}件を${label}にしました。`, true); load(); }
    else onMsg("一括更新に失敗しました。", false);
  };

  return (
    <div className="space-y-3 border-t border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
        <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-white/80"><Pin className="h-3.5 w-3.5" /> 記事・お知らせを投稿（上部に固定）</p>
        <Input value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="表示名（例：運営／タイムテーブル）" className={`mb-1.5 h-8 text-xs ${darkInput}`} />
        <textarea value={articleBody} onChange={(e) => setArticleBody(e.target.value)} rows={3} maxLength={1000} placeholder="本文（イベント情報・登壇者・注意事項など）" className="w-full resize-none rounded-md border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none" />
        <div className="mt-1.5 flex justify-end">
          <Button size="sm" onClick={postArticle} disabled={posting} className="h-8 gap-1 text-xs">
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 記事を投稿
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-white/40" /></div>
      ) : posts.length === 0 ? (
        <p className="text-xs text-white/40">投稿はまだありません。</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/45">{posts.length}件の投稿</span>
            <button
              type="button"
              onClick={() => bulkSetHidden(true)}
              disabled={bulkBusy}
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-2.5 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-40"
            >
              {bulkBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
              すべて非表示
            </button>
            <button
              type="button"
              onClick={() => bulkSetHidden(false)}
              disabled={bulkBusy}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-40"
            >
              {bulkBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
              すべて表示
            </button>
          </div>
          <ul className="space-y-1.5">
            {posts.map((p) => (
              <li key={p.id} className={`rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs ${p.isHidden ? "opacity-50" : ""}`}>
                <div className="mb-1 flex items-center gap-1.5">
                  {p.isPinned && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300"><Pin className="h-2.5 w-2.5" />固定</span>}
                  <span className="font-bold text-white">{p.authorName}</span>
                  {p.authorRole && <span className="text-white/40">· {p.authorRole}</span>}
                  {p.isHidden && <span className="text-[10px] text-white/30">（非表示）</span>}
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={() => patch(p.id, { isPinned: !p.isPinned })} className="rounded p-0.5 text-white/40 hover:text-white" title={p.isPinned ? "固定解除" : "固定する"}>
                      {p.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => patch(p.id, { isHidden: !p.isHidden })} className="rounded p-0.5 text-white/40 hover:text-white" title={p.isHidden ? "表示する" : "非表示にする"}>
                      {p.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => remove(p.id)} className="rounded p-0.5 text-white/40 hover:text-red-300" title="削除"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-white/80">{p.body}</p>

                {p.aiReply && (
                  <div className={`mt-2 rounded-md border border-violet-400/25 bg-violet-400/[0.08] px-2 py-1.5 ${p.aiReply.isHidden ? "opacity-50" : ""}`}>
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <Bot className="h-3 w-3 text-violet-300" />
                      <span className="font-semibold text-violet-200">AI返信</span>
                      {p.aiReply.isHidden && <span className="text-[10px] text-white/30">（非表示）</span>}
                      <button
                        type="button"
                        onClick={() => patch(p.aiReply!.id, { isHidden: !p.aiReply!.isHidden })}
                        className="ml-auto rounded p-0.5 text-white/40 hover:text-white"
                        title={p.aiReply.isHidden ? "表示する" : "非表示にする"}
                      >
                        {p.aiReply.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-white/75">{p.aiReply.body}</p>
                  </div>
                )}

                {(p.userReplies?.length ?? 0) > 0 && (
                  <ul className="mt-2 space-y-1.5 border-l border-white/10 pl-2">
                    {p.userReplies!.map((r) => (
                      <li key={r.id} className={`rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 ${r.isHidden ? "opacity-50" : ""}`}>
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3 text-white/40" />
                          <span className="font-semibold text-white/85">{r.authorName}</span>
                          {r.authorRole && <span className="text-white/40">· {r.authorRole}</span>}
                          {r.isHidden && <span className="text-[10px] text-white/30">（非表示）</span>}
                          <button
                            type="button"
                            onClick={() => patch(r.id, { isHidden: !r.isHidden })}
                            className="ml-auto rounded p-0.5 text-white/40 hover:text-white"
                            title={r.isHidden ? "表示する" : "非表示にする"}
                          >
                            {r.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-white/75">{r.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
