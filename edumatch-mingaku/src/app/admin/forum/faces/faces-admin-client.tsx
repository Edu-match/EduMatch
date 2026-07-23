"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Flame, ArrowUp, ArrowDown, X, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Category = { name: string; slug: string };
type SubCategory = { name: string; slug: string };
type PinItem = {
  sourceType: string;
  sourceId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  href: string;
  meta?: string | null;
};
type HotOverride = "auto" | "on" | "off";

function toHot(v: boolean | null): HotOverride {
  return v === true ? "on" : v === false ? "off" : "auto";
}
function fromHot(v: HotOverride): boolean | null {
  return v === "on" ? true : v === "off" ? false : null;
}
function keyOf(p: { sourceType: string; sourceId: string }) {
  return `${p.sourceType}:${p.sourceId}`;
}

export function FacesAdminClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categorySlug, setCategorySlug] = useState("");
  const [subSlug, setSubSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contentKind, setContentKind] = useState<string | null>(null);
  const [hot, setHot] = useState<HotOverride>("auto");
  const [pinned, setPinned] = useState<PinItem[]>([]);
  const [candidates, setCandidates] = useState<PinItem[]>([]);
  const [candQuery, setCandQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // カテゴリ・サブカテゴリ一覧
  useEffect(() => {
    fetch("/api/forum/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(console.error);
    fetch("/api/forum/sub-categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSubCategories(d.subCategories ?? []))
      .catch(console.error);
  }, []);

  // 面の現在設定を取得
  useEffect(() => {
    if (!categorySlug || !subSlug) return;
    setLoading(true);
    setMessage(null);
    const q = new URLSearchParams({ categorySlug, subSlug });
    fetch(`/api/admin/forum/face?${q}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setMessage(d.error); return; }
        setContentKind(d.contentKind ?? null);
        setHot(toHot(d.hotOverride ?? null));
        setPinned(d.pinned ?? []);
        setCandidates(d.candidates ?? []);
      })
      .catch((e) => setMessage(String(e)))
      .finally(() => setLoading(false));
  }, [categorySlug, subSlug]);

  const pinnedKeys = useMemo(() => new Set(pinned.map(keyOf)), [pinned]);
  const filteredCandidates = useMemo(() => {
    const q = candQuery.trim().toLowerCase();
    return candidates
      .filter((c) => !pinnedKeys.has(keyOf(c)))
      .filter((c) => !q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q))
      .slice(0, 40);
  }, [candidates, pinnedKeys, candQuery]);

  const move = (i: number, dir: -1 | 1) => {
    setPinned((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    if (!categorySlug || !subSlug) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/forum/face", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categorySlug, subSlug, pinned, hotOverride: fromHot(hot) }),
      });
      const d = await res.json();
      setMessage(res.ok ? "保存しました。" : (d.error ?? "保存に失敗しました。"));
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  };

  const isCommunity = contentKind === "community";
  const faceSelected = !!categorySlug && !!subSlug;

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-xl font-bold">井戸端：面の固定コンテンツ・炎マーク</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          大カテゴリ×面（記事/サービス/動画/イベント）に固定表示するコンテンツと、炎マークの手動設定を行います。
        </p>
      </div>

      {/* 面の選択 */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">大カテゴリ</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
          >
            <option value="">選択…</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">面（サブカテゴリ）</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={subSlug}
            onChange={(e) => setSubSlug(e.target.value)}
          >
            <option value="">選択…</option>
            {subCategories.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </label>
        {faceSelected && (
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存
          </Button>
        )}
      </div>

      {message && <p className="text-sm font-medium text-primary">{message}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : faceSelected ? (
        <>
          {/* 炎マーク */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-semibold">炎マーク</span>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={hot}
                onChange={(e) => setHot(e.target.value as HotOverride)}
              >
                <option value="auto">自動（活動量で判定）</option>
                <option value="on">強制ON（常に炎）</option>
                <option value="off">強制OFF（炎を付けない）</option>
              </select>
            </CardContent>
          </Card>

          {/* コミュニティ面はコンテンツ固定なし */}
          {isCommunity ? (
            <p className="text-sm text-muted-foreground">
              コミュニティ面はコンテンツ固定の対象外です（炎マークのみ設定できます）。
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* 固定中 */}
              <div>
                <h2 className="mb-2 text-sm font-semibold">固定中（上から表示順）</h2>
                {pinned.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                    まだ固定コンテンツはありません。右から追加してください。
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pinned.map((p, i) => (
                      <li key={keyOf(p)} className="flex items-center gap-2 rounded-lg border p-2">
                        <span className="flex flex-col">
                          <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown className="h-3.5 w-3.5" /></button>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.title}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{p.sourceType} ・ {p.href}</span>
                        </span>
                        <button type="button" onClick={() => setPinned((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 候補 */}
              <div>
                <h2 className="mb-2 text-sm font-semibold">追加できるコンテンツ</h2>
                <Input value={candQuery} onChange={(e) => setCandQuery(e.target.value)} placeholder="タイトルで絞り込み" className="mb-2" />
                <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredCandidates.map((c) => (
                    <li key={keyOf(c)} className="flex items-center gap-2 rounded-lg border p-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{c.sourceType}</span>
                      </span>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setPinned((prev) => [...prev, c])} disabled={pinned.length >= 12}>
                        <Plus className="h-3.5 w-3.5" />追加
                      </Button>
                    </li>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <li className="px-2 py-6 text-center text-xs text-muted-foreground">候補がありません。</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">大カテゴリと面を選択してください。</p>
      )}
    </div>
  );
}
