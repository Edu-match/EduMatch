"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  isPrimary: boolean;
  sortOrder: number;
};

export function InteropAdminClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#C9D4F6");
  const [isPrimary, setIsPrimary] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/interop/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/interop/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color, isPrimary, sortOrder: categories.length }),
      });
      const d = await res.json();
      if (res.ok) {
        setName("");
        setIsPrimary(false);
        setMessage(`「${d.category.name}」を追加しました。`);
        load();
      } else {
        setMessage(d.error ?? "追加に失敗しました。");
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-xl font-bold">Interop特設：カテゴリ管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          特設ページ（/interop）のカテゴリを追加します。中心に置く「インフォメーション」はメインに設定してください。
          ※サブカテゴリ・案内記事は本体の管理／記事投稿を流用します。
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">カテゴリ名</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：AI部" className="w-48" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">色</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 rounded border" />
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            <Info className="h-3.5 w-3.5" /> メイン（中心）
          </label>
          <Button onClick={add} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            追加
          </Button>
        </CardContent>
      </Card>

      {message && <p className="text-sm font-medium text-primary">{message}</p>}

      <div>
        <h2 className="mb-2 text-sm font-semibold">登録済みカテゴリ</h2>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : categories.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">まだありません。</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="h-5 w-5 rounded-full border" style={{ background: c.color }} />
                <span className="font-medium">{c.name}</span>
                {c.isPrimary && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">メイン</span>}
                <span className="ml-auto text-[11px] text-muted-foreground">{c.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
