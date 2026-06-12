"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Info, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  isPrimary: boolean;
  sortOrder: number;
};

type SubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
};

export function InteropAdminClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subsByCat, setSubsByCat] = useState<Record<string, SubCategory[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // カテゴリ追加フォーム
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#C9D4F6");
  const [catPrimary, setCatPrimary] = useState(false);
  const [addingCat, setAddingCat] = useState(false);

  // サブカテゴリ追加フォーム（カテゴリID → 入力値）
  const [subInputs, setSubInputs] = useState<Record<string, { name: string; desc: string }>>({});

  // ── ロード ──────────────────────────────────────────────
  const loadCategories = async () => {
    setLoading(true);
    const d = await fetch("/api/interop/categories", { credentials: "include" }).then((r) => r.json()).catch(() => ({}));
    const cats: Category[] = d.categories ?? [];
    setCategories(cats);

    // 全カテゴリのサブカテゴリを並行取得
    const entries = await Promise.all(
      cats.map((c) =>
        fetch(`/api/interop/sub-categories?categoryId=${c.id}`, { credentials: "include" })
          .then((r) => r.json())
          .then((d) => [c.id, d.subCategories ?? []] as [string, SubCategory[]])
          .catch(() => [c.id, []] as [string, SubCategory[]])
      )
    );
    setSubsByCat(Object.fromEntries(entries));
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, []);

  // ── カテゴリ追加 ─────────────────────────────────────────
  const addCategory = async () => {
    if (!catName.trim()) return;
    setAddingCat(true);
    setMsg(null);
    const res = await fetch("/api/interop/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: catName, color: catColor, isPrimary: catPrimary, sortOrder: categories.length }),
    }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setMsg({ text: `「${d.category.name}」を追加しました。`, ok: true });
      setCatName(""); setCatPrimary(false);
      await loadCategories();
    } else {
      setMsg({ text: "追加に失敗しました。", ok: false });
    }
    setAddingCat(false);
  };

  // ── サブカテゴリ追加 ─────────────────────────────────────
  const addSub = async (catId: string) => {
    const inp = subInputs[catId];
    if (!inp?.name?.trim()) return;
    const res = await fetch("/api/interop/sub-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ categoryId: catId, name: inp.name, description: inp.desc ?? "", sortOrder: (subsByCat[catId]?.length ?? 0) }),
    }).catch(() => null);
    if (res?.ok) {
      setMsg({ text: `サブカテゴリ「${inp.name}」を追加しました。`, ok: true });
      setSubInputs((prev) => ({ ...prev, [catId]: { name: "", desc: "" } }));
      await loadCategories();
    } else {
      setMsg({ text: "サブカテゴリの追加に失敗しました。", ok: false });
    }
  };

  // ── サブカテゴリ削除 ─────────────────────────────────────
  const deleteSub = async (subId: string, subName: string) => {
    if (!confirm(`「${subName}」を削除しますか？`)) return;
    const res = await fetch(`/api/interop/sub-categories/${subId}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => null);
    if (res?.ok) {
      setMsg({ text: `「${subName}」を削除しました。`, ok: true });
      await loadCategories();
    } else {
      setMsg({ text: "削除に失敗しました。", ok: false });
    }
  };

  // ── UI ──────────────────────────────────────────────────
  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-xl font-bold">教育AIサミット：インフォメーション管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          /interop の特設ページ用カテゴリ・サブカテゴリを管理します。
          中心（メイン）に設定したカテゴリが「インフォメーション」として中央に表示されます。
        </p>
      </div>

      {msg && (
        <p className={`rounded-md border px-4 py-2 text-sm font-medium ${msg.ok ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      {/* カテゴリ追加フォーム */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">カテゴリを追加</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">カテゴリ名</span>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="例：AI部" className="w-48" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">色</span>
            <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="h-9 w-14 rounded border" />
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={catPrimary} onChange={(e) => setCatPrimary(e.target.checked)} />
            <Info className="h-3.5 w-3.5" /> メイン（中心）
          </label>
          <Button onClick={addCategory} disabled={addingCat} className="gap-1.5">
            {addingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            追加
          </Button>
        </CardContent>
      </Card>

      {/* カテゴリ一覧＋サブカテゴリ */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">登録済みカテゴリ</h2>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : categories.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">まだありません。</p>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => {
              const isOpen = !!expanded[c.id];
              const subs = subsByCat[c.id] ?? [];
              return (
                <div key={c.id} className="rounded-lg border">
                  {/* カテゴリ行 */}
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [c.id]: !isOpen }))}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50"
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full border" style={{ background: c.color }} />
                    <span className="flex-1 font-medium">{c.name}</span>
                    {c.isPrimary && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">メイン</span>}
                    <span className="text-[11px] text-muted-foreground">{subs.length}件</span>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {/* サブカテゴリ展開 */}
                  {isOpen && (
                    <div className="border-t bg-muted/20 px-3 py-3 space-y-2">
                      {subs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">サブカテゴリはまだありません。</p>
                      ) : (
                        <ul className="space-y-1">
                          {subs.map((s) => (
                            <li key={s.id} className="flex items-center gap-2 rounded border bg-background px-3 py-1.5 text-sm">
                              <span className="flex-1">{s.name}</span>
                              <span className="text-[10px] text-muted-foreground">{s.slug}</span>
                              <button
                                type="button"
                                onClick={() => deleteSub(s.id, s.name)}
                                className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive"
                                title="削除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* サブカテゴリ追加 */}
                      <div className="flex flex-wrap items-end gap-2 pt-1">
                        <label className="text-xs">
                          <span className="mb-1 block text-muted-foreground">名前</span>
                          <Input
                            value={subInputs[c.id]?.name ?? ""}
                            onChange={(e) => setSubInputs((p) => ({ ...p, [c.id]: { ...p[c.id], name: e.target.value } }))}
                            placeholder="例：タイムテーブル"
                            className="h-8 w-36 text-xs"
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block text-muted-foreground">説明（任意）</span>
                          <Input
                            value={subInputs[c.id]?.desc ?? ""}
                            onChange={(e) => setSubInputs((p) => ({ ...p, [c.id]: { ...p[c.id], desc: e.target.value } }))}
                            placeholder="任意のメモ"
                            className="h-8 w-44 text-xs"
                          />
                        </label>
                        <Button size="sm" variant="outline" onClick={() => addSub(c.id)} className="h-8 gap-1 text-xs">
                          <Plus className="h-3.5 w-3.5" /> 追加
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
