"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

type SubCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  contentKind: string;
  sortOrder: number;
  isActive: boolean;
};

const CONTENT_KINDS: { value: string; label: string }[] = [
  { value: "community", label: "コミュニティ（掲示板のみ）" },
  { value: "article", label: "Article（記事）" },
  { value: "service", label: "Service（サービス）" },
  { value: "media", label: "Media（メディア・動画）" },
  { value: "events-info", label: "Events Info（イベント情報）" },
];

const ICON_OPTIONS = [
  "MessageCircle",
  "FileText",
  "Briefcase",
  "Video",
  "Calendar",
];

export function AdminForumCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規大カテゴリ
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#FBC9D4");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // 新規サブカテゴリ
  const [newSubName, setNewSubName] = useState("");
  const [newSubKind, setNewSubKind] = useState("community");
  const [newSubIcon, setNewSubIcon] = useState("MessageCircle");
  const [savingSub, setSavingSub] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/forum/categories?includeInactive=true", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/forum/sub-categories?includeInactive=true", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([cat, sub]) => {
        if (Array.isArray(cat.categories)) setCategories(cat.categories);
        if (Array.isArray(sub.subCategories)) setSubCategories(sub.subCategories);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── 大カテゴリ操作 ─────────────────────────────
  const handleAddCategory = async () => {
    if (!newCatName.trim() || savingCat) return;
    setSavingCat(true);
    try {
      const res = await fetch("/api/forum/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          color: newCatColor,
          sortOrder: categories.length,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCategories((prev) => [...prev, data.category]);
        setNewCatName("");
        setNewCatDesc("");
      } else {
        alert("大カテゴリの作成に失敗しました");
      }
    } finally {
      setSavingCat(false);
    }
  };

  const handleUpdateCategory = async (cat: Category, patch: Partial<Category>) => {
    const res = await fetch(`/api/forum/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? data.category : c)));
    } else {
      alert("更新に失敗しました");
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`大カテゴリ「${cat.name}」を削除しますか？`)) return;
    const res = await fetch(`/api/forum/categories/${cat.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } else {
      alert("削除に失敗しました");
    }
  };

  // ─── サブカテゴリ操作 ───────────────────────────
  const handleAddSub = async () => {
    if (!newSubName.trim() || savingSub) return;
    setSavingSub(true);
    try {
      const res = await fetch("/api/forum/sub-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newSubName.trim(),
          contentKind: newSubKind,
          icon: newSubIcon,
          sortOrder: subCategories.length,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubCategories((prev) => [...prev, data.subCategory]);
        setNewSubName("");
      } else {
        alert("サブカテゴリの作成に失敗しました");
      }
    } finally {
      setSavingSub(false);
    }
  };

  const handleUpdateSub = async (sub: SubCategory, patch: Partial<SubCategory>) => {
    const res = await fetch(`/api/forum/sub-categories/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setSubCategories((prev) => prev.map((s) => (s.id === sub.id ? data.subCategory : s)));
    } else {
      alert("更新に失敗しました");
    }
  };

  const handleDeleteSub = async (sub: SubCategory) => {
    if (!window.confirm(`サブカテゴリ「${sub.name}」を削除しますか？`)) return;
    const res = await fetch(`/api/forum/sub-categories/${sub.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setSubCategories((prev) => prev.filter((s) => s.id !== sub.id));
    } else {
      alert("削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── 大カテゴリ ─── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold">大カテゴリ</h2>
          <p className="text-xs text-muted-foreground">
            マップビューに表示されるバブル。色はパステルカラーのHEXで指定します。
          </p>
        </div>

        <div className="space-y-2">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => handleUpdateCategory(cat, { color: e.target.value })}
                  className="h-9 w-9 cursor-pointer rounded-md border"
                  title="バブルの色"
                />
                <Input
                  defaultValue={cat.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== cat.name) {
                      handleUpdateCategory(cat, { name: e.target.value.trim() });
                    }
                  }}
                  className="w-40"
                />
                <Input
                  defaultValue={cat.description}
                  placeholder="説明（任意）"
                  onBlur={(e) => {
                    if (e.target.value !== cat.description) {
                      handleUpdateCategory(cat, { description: e.target.value });
                    }
                  }}
                  className="min-w-[200px] flex-1"
                />
                <span className="text-[11px] text-muted-foreground">/{cat.slug}</span>
                <Button
                  size="sm"
                  variant={cat.isActive ? "outline" : "secondary"}
                  onClick={() => handleUpdateCategory(cat, { isActive: !cat.isActive })}
                >
                  {cat.isActive ? "公開中" : "非公開"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(cat)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-end gap-3 p-3">
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-md border"
            />
            <div className="space-y-1">
              <Label className="text-xs">カテゴリ名</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="例: 探究学習でのAI活用"
                className="w-48"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">説明（任意）</Label>
              <Input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="バブルに表示される補足"
                className="min-w-[200px]"
              />
            </div>
            <Button onClick={handleAddCategory} disabled={!newCatName.trim() || savingCat} className="gap-1.5">
              {savingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              追加
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ─── サブカテゴリ ─── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold">サブカテゴリ</h2>
          <p className="text-xs text-muted-foreground">
            各大カテゴリの中に共通で表示されます。種別に応じて関連コンテンツを上部に表示します（コミュニティは掲示板のみ）。
          </p>
        </div>

        <div className="space-y-2">
          {subCategories.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <Input
                  defaultValue={sub.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== sub.name) {
                      handleUpdateSub(sub, { name: e.target.value.trim() });
                    }
                  }}
                  className="w-40"
                />
                <Select
                  value={sub.contentKind}
                  onValueChange={(v) => handleUpdateSub(sub, { contentKind: v })}
                >
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sub.icon ?? "MessageCircle"}
                  onValueChange={(v) => handleUpdateSub(sub, { icon: v })}
                >
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">/{sub.slug}</span>
                <Button
                  size="sm"
                  variant={sub.isActive ? "outline" : "secondary"}
                  onClick={() => handleUpdateSub(sub, { isActive: !sub.isActive })}
                >
                  {sub.isActive ? "公開中" : "非公開"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDeleteSub(sub)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-end gap-3 p-3">
            <div className="space-y-1">
              <Label className="text-xs">サブカテゴリ名</Label>
              <Input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="例: Article"
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">種別</Label>
              <Select value={newSubKind} onValueChange={setNewSubKind}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">アイコン</Label>
              <Select value={newSubIcon} onValueChange={setNewSubIcon}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddSub} disabled={!newSubName.trim() || savingSub} className="gap-1.5">
              {savingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              追加
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
