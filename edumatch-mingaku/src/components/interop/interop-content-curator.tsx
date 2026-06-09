"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, EyeOff, ImageIcon, Loader2, Pin, Plus, Search, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadImage } from "@/app/_actions/media";
import { CUSTOM_LABEL_OPTIONS, INTEROP_CONTENT_KINDS, type InteropContentItem } from "@/lib/interop-content";

type Category = { id: string; name: string; color?: string };
type SubCategory = { id: string; categoryId: string; name: string };
type Pin = {
  id: string; sourceType: string; sourceId: string; title: string;
  thumbnailUrl: string | null; href: string; meta?: string; isHidden: boolean; rankOrder: number;
};

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function InteropContentCurator({ onMsg }: { onMsg: (t: string, ok: boolean) => void }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [subId, setSubId] = useState("");
  const [loadingSubs, setLoadingSubs] = useState(true);

  const [preview, setPreview] = useState<InteropContentItem[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<InteropContentItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultFilter, setResultFilter] = useState("");
  const [resultKind, setResultKind] = useState<string>("all");

  // カテゴリ＋サブカテゴリ一覧
  useEffect(() => {
    (async () => {
      setLoadingSubs(true);
      const { data: cd } = await api("/api/interop/categories?all=true");
      const { data: sd } = await api("/api/interop/sub-categories?all=true");
      const cs: Category[] = cd.categories ?? [];
      const ss: SubCategory[] = sd.subCategories ?? [];
      setCats(cs);
      setSubs(ss);
      setLoadingSubs(false);
      if (ss.length > 0) setSubId((cur) => cur || ss[0].id);
    })();
  }, []);

  const reload = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    const [{ data: pv }, { data: pn }] = await Promise.all([
      api(`/api/interop/content?subCategoryId=${id}`),
      api(`/api/interop/content/pins?subCategoryId=${id}`),
    ]);
    setPreview(pv.items ?? []);
    setPins(pn.pins ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (subId) { reload(subId); setCandidates([]); setQ(""); setResultFilter(""); setResultKind("all"); } }, [subId, reload]);

  const search = async () => {
    if (!subId) return;
    setSearching(true);
    const kindParam = kinds.length > 0 ? `&kinds=${kinds.join(",")}` : "";
    const { data } = await api(`/api/interop/content/candidates?subCategoryId=${subId}&q=${encodeURIComponent(q)}${kindParam}`);
    setCandidates(data.items ?? []);
    setResultFilter("");
    setResultKind("all");
    setSearching(false);
  };

  const addPin = async (it: InteropContentItem) => {
    const { ok } = await api("/api/interop/content/pins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subCategoryId: subId, sourceType: it.sourceType, sourceId: it.sourceId,
        title: it.title, description: it.description, thumbnailUrl: it.thumbnailUrl, href: it.href, meta: it.meta,
      }),
    });
    if (ok) { onMsg("ピン留めしました。", true); reload(subId); } else onMsg("失敗しました。", false);
  };
  const hideAuto = async (it: InteropContentItem) => {
    const { ok } = await api("/api/interop/content/pins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subCategoryId: subId, sourceType: it.sourceType, sourceId: it.sourceId, title: it.title, href: it.href, isHidden: true }),
    });
    if (ok) { onMsg("非表示にしました。", true); reload(subId); } else onMsg("失敗しました。", false);
  };
  const removePin = async (id: string) => {
    const { ok } = await api(`/api/interop/content/pins/${id}`, { method: "DELETE" });
    if (ok) reload(subId); else onMsg("失敗しました。", false);
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const visible = pins.filter((p) => !p.isHidden);
    const cur = visible[idx]; const target = visible[idx + dir];
    if (!cur || !target) return;
    await Promise.all([
      api(`/api/interop/content/pins/${cur.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rankOrder: target.rankOrder }) }),
      api(`/api/interop/content/pins/${target.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rankOrder: cur.rankOrder }) }),
    ]);
    reload(subId);
  };

  const visiblePins = pins.filter((p) => !p.isHidden);
  const hiddenPins = pins.filter((p) => p.isHidden);
  const pinnedKeys = useMemo(() => new Set(pins.map((p) => `${p.sourceType}:${p.sourceId}`)), [pins]);

  // 検索結果の絞り込み（種別タブ＋テキスト）
  const resultKinds = useMemo(() => {
    const m = new Map<string, number>();
    candidates.forEach((c) => m.set(c.kindLabel, (m.get(c.kindLabel) ?? 0) + 1));
    return Array.from(m.entries());
  }, [candidates]);
  const filteredCandidates = useMemo(() => {
    const f = resultFilter.trim().toLowerCase();
    return candidates.filter((c) =>
      (resultKind === "all" || c.kindLabel === resultKind) &&
      (!f || `${c.title} ${c.description} ${c.meta ?? ""}`.toLowerCase().includes(f))
    );
  }, [candidates, resultFilter, resultKind]);

  const selectedSub = subs.find((s) => s.id === subId);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">コンテンツ・キュレーション</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {loadingSubs ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">先に「マップ構成」でサブカテゴリを作成してください。</p>
        ) : (
          <>
            {/* サブカテゴリ・ピッカー（カテゴリごとにグループ表示） */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">編集するサブカテゴリ</p>
              <div className="space-y-2.5">
                {cats.map((c) => {
                  const list = subs.filter((s) => s.categoryId === c.id);
                  if (list.length === 0) return null;
                  return (
                    <div key={c.id} className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-bold text-foreground/70">
                        <span className="h-2.5 w-2.5 rounded-full border" style={{ background: c.color ?? "#9fb4e8" }} />
                        {c.name}
                      </span>
                      {list.map((s) => {
                        const active = s.id === subId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSubId(s.id)}
                            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                              active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedSub && (
              <p className="text-sm font-bold">
                「{cats.find((c) => c.id === selectedSub.categoryId)?.name} ／ {selectedSub.name}」のコンテンツ
              </p>
            )}

            {/* 現在の表示プレビュー */}
            <div>
              <p className="mb-2 text-sm font-semibold">現在の表示（公開と同じ並び）</p>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : preview.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
                  表示コンテンツがありません。下で検索してピン留めするか、「マップ構成」で自動抽出の種別・キーワードを設定してください。
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {preview.map((it) => {
                    const pin = visiblePins.find((p) => p.sourceType === it.sourceType && p.sourceId === it.sourceId);
                    const pinIdx = pin ? visiblePins.indexOf(pin) : -1;
                    return (
                      <li key={it.id} className="flex items-center gap-2 rounded border bg-background px-2 py-1.5 text-xs">
                        <Thumb url={it.thumbnailUrl} />
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">{it.kindLabel}</span>
                        <span className="flex-1 truncate">{it.title}</span>
                        {it.pinned
                          ? <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"><Pin className="h-2.5 w-2.5" />ピン</span>
                          : <span className="text-[10px] text-muted-foreground">自動</span>}
                        {it.pinned && pin ? (
                          <>
                            <button type="button" disabled={pinIdx <= 0} onClick={() => move(pinIdx, -1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="上へ"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" disabled={pinIdx >= visiblePins.length - 1} onClick={() => move(pinIdx, 1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="下へ"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => removePin(pin.id)} className="rounded p-0.5 text-muted-foreground hover:text-destructive" title="ピン解除"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => addPin(it)} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title="ピン留め（上部固定）"><Pin className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => hideAuto(it)} className="rounded p-0.5 text-muted-foreground hover:text-destructive" title="非表示にする"><EyeOff className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {hiddenPins.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">非表示中:</span>
                  {hiddenPins.map((p) => (
                    <button key={p.id} type="button" onClick={() => removePin(p.id)} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground" title="非表示を解除">
                      {p.title || p.sourceId} <X className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 検索してピン追加 */}
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="mb-2 text-sm font-semibold">本体エデュマッチから探してピン留め</p>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {INTEROP_CONTENT_KINDS.map((k) => {
                  const on = kinds.includes(k.value);
                  return (
                    <button key={k.value} type="button"
                      onClick={() => setKinds((prev) => on ? prev.filter((x) => x !== k.value) : [...prev, k.value])}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                      {k.label}
                    </button>
                  );
                })}
                <span className="text-[10px] text-muted-foreground">（未選択なら全種別）</span>
              </div>
              <div className="flex gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") search(); }} placeholder="キーワード（空ならカテゴリ名で検索）" className="h-9 text-sm" />
                <Button onClick={search} disabled={searching} className="h-9 gap-1">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 検索
                </Button>
              </div>

              {candidates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* 結果の絞り込み（種別タブ＋テキスト） */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => setResultKind("all")} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${resultKind === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>すべて {candidates.length}</button>
                    {resultKinds.map(([label, n]) => (
                      <button key={label} type="button" onClick={() => setResultKind(label)} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${resultKind === label ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{label} {n}</button>
                    ))}
                    <div className="relative ml-auto">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} placeholder="結果を絞り込み" className="h-7 w-44 rounded-md border bg-background pl-7 pr-2 text-[11px]" />
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">{filteredCandidates.length}件を表示</p>
                  <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                    {filteredCandidates.map((it) => {
                      const already = pinnedKeys.has(`${it.sourceType}:${it.sourceId}`);
                      return (
                        <li key={it.id} className="flex items-center gap-2 rounded border bg-background px-2 py-1.5 text-xs">
                          <Thumb url={it.thumbnailUrl} />
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">{it.kindLabel}</span>
                          <span className="flex-1 truncate" title={it.title}>{it.title}</span>
                          {already ? (
                            <span className="inline-flex items-center gap-0.5 px-1 text-[10px] font-bold text-emerald-600"><Check className="h-3 w-3" />追加済</span>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => addPin(it)} className="h-7 gap-1 text-[11px]"><Plus className="h-3 w-3" />ピン</Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* 自作コンテンツをアップロードして追加 */}
            <UploadContentForm subId={subId} onAdded={() => reload(subId)} onMsg={onMsg} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────── 自作コンテンツ（ローカル画像アップロード） ─────────── */
function UploadContentForm({ subId, onAdded, onMsg }: { subId: string; onAdded: () => void; onMsg: (t: string, ok: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [href, setHref] = useState("");
  const [desc, setDesc] = useState("");
  const [sourceType, setSourceType] = useState(CUSTOM_LABEL_OPTIONS[0].sourceType);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadImage(fd);
    setUploading(false);
    if (res.success && res.url) { setImageUrl(res.url); onMsg("画像をアップロードしました。", true); }
    else onMsg(res.error || "アップロードに失敗しました。", false);
  };

  const add = async () => {
    if (!title.trim()) { onMsg("タイトルを入力してください。", false); return; }
    if (!imageUrl && !href.trim()) { onMsg("画像かリンクのどちらかは必要です。", false); return; }
    setSaving(true);
    const res = await fetch("/api/interop/content/pins", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subCategoryId: subId,
        sourceType,
        sourceId: `custom-${Date.now()}`,
        title: title.trim(),
        description: desc.trim(),
        thumbnailUrl: imageUrl,
        href: href.trim() || imageUrl || "",
      }),
    });
    setSaving(false);
    if (res.ok) {
      onMsg("追加しました。", true);
      setTitle(""); setHref(""); setDesc(""); setImageUrl(null);
      onAdded();
    } else {
      onMsg("追加に失敗しました。", false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="mb-2 text-sm font-semibold">自作コンテンツをアップロードして追加</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* 画像アップロード */}
        <div className="shrink-0">
          <label className="grid h-28 w-44 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed bg-background text-center text-xs text-muted-foreground transition hover:border-primary/50">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1"><Upload className="h-5 w-5" />画像を選択<br />（5MBまで）</span>
            )}
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
          </label>
          {imageUrl && (
            <button type="button" onClick={() => setImageUrl(null)} className="mt-1 text-[11px] text-muted-foreground hover:text-destructive">画像を削除</button>
          )}
        </div>

        {/* テキスト入力 */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">ラベル:</span>
            {CUSTOM_LABEL_OPTIONS.map((o) => (
              <button key={o.sourceType} type="button" onClick={() => setSourceType(o.sourceType)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${sourceType === o.sourceType ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                {o.label}
              </button>
            ))}
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル（必須）" className="h-8 text-sm" />
          <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="リンクURL（任意・空なら画像を開く）" className="h-8 text-sm" />
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="説明（任意）" className="h-8 text-sm" />
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={saving || uploading} className="h-8 gap-1 text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}コンテンツに追加
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="grid h-9 w-14 shrink-0 place-items-center overflow-hidden rounded bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
      )}
    </span>
  );
}
