"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Landmark, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CenterHubItem } from "@/lib/interop-settings";

type Sub = { id: string; name: string; slug: string };
const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULTS: CenterHubItem[] = [
  { id: uid(), name: "インフォメーション", kind: "link", url: "https://prtimes.jp/main/html/rd/p/000000046.000161501.html" },
  { id: uid(), name: "AIチャンピオンシップ", kind: "link", url: "https://ai-ueo.org/2026/04/01/u18-ai-championship-2026/" },
  { id: uid(), name: "ご意見・要望", kind: "board" },
];

/** 中心ハブ（中央の玉）の設定。表示名＋タップで出る項目（リンク先遷移 or 投稿ページ）を編集・新規作成。 */
export function AdminCenterHub({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [label, setLabel] = useState("");
  const [items, setItems] = useState<CenterHubItem[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/interop/settings").then((r) => r.json()).catch(() => ({})),
      fetch("/api/interop/sub-categories?all=true", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([s, sub]) => {
      const st = s.settings ?? {};
      setLabel(st.centerLabel ?? "");
      const list: Sub[] = Array.isArray(sub.subCategories) ? sub.subCategories : [];
      setSubs(list);
      const saved: CenterHubItem[] = Array.isArray(st.centerHubItems) ? st.centerHubItems : [];
      if (saved.length > 0) setItems(saved);
      else {
        // 既定をシード（ご意見の掲示板は giin-opinion を割当）
        const opinion = list.find((x) => x.slug === "giin-opinion") ?? list.find((x) => x.slug === "interop-opinion-box");
        setItems(DEFAULTS.map((d) => (d.kind === "board" ? { ...d, subId: opinion?.id } : d)));
      }
    }).finally(() => setLoading(false));
  }, []);

  const patch = (id: string, p: Partial<CenterHubItem>) =>
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const move = (i: number, d: -1 | 1) =>
    setItems((arr) => { const n = [...arr]; const j = i + d; if (j < 0 || j >= n.length) return arr; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const save = async () => {
    setSaving(true); setSaved(false);
    const res = await fetch("/api/interop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ centerLabel: label, centerHubItems: items.filter((i) => i.name.trim()) }),
    }).catch(() => null);
    if (res?.ok) { setSaved(true); window.setTimeout(() => setSaved(false), 2500); } else alert("保存に失敗しました");
    setSaving(false);
  };

  return (
    <section className="rounded-lg border bg-card">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Landmark className="h-4 w-4" /></span>
        <div className="flex-1">
          <p className="text-sm font-bold">中心ハブ（中央の玉）の設定</p>
          <p className="text-xs text-muted-foreground">中央の玉の名前と、タップで出る項目（リンク先 or 投稿ページ）を管理。</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-4 border-t p-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <label className="block text-xs">
                <span className="mb-1 block text-muted-foreground">中央の玉に表示する名前</span>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例：教育AIサミット＠衆議院第一議員会館" />
              </label>

              <div className="space-y-2">
                <p className="text-xs font-semibold">中心ハブの項目（タップで出る）</p>
                {items.map((it, i) => (
                  <div key={it.id} className="rounded-md border bg-muted/30 p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col text-muted-foreground">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30 hover:text-foreground"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="disabled:opacity-30 hover:text-foreground"><ChevronDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      <Input value={it.name} onChange={(e) => patch(it.id, { name: e.target.value })} placeholder="項目名" className="h-8 flex-1 text-sm" />
                      <Select value={it.kind} onValueChange={(v) => patch(it.id, { kind: v as "link" | "board" })}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">リンク先へ遷移</SelectItem>
                          <SelectItem value="board">投稿ページ</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => setItems((a) => a.filter((x) => x.id !== it.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="mt-2 pl-8">
                      {it.kind === "link" ? (
                        <Input value={it.url ?? ""} onChange={(e) => patch(it.id, { url: e.target.value })} placeholder="https://… 遷移先URL" className="h-8 text-xs" />
                      ) : (
                        <Select value={it.subId ?? ""} onValueChange={(v) => patch(it.id, { subId: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="掲示板（サブカテゴリ）を選択" /></SelectTrigger>
                          <SelectContent>
                            {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setItems((a) => [...a, { id: uid(), name: "", kind: "link", url: "" }])}>
                  <Plus className="h-3.5 w-3.5" />項目を追加
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}保存
                </Button>
                {saved && <span className="text-xs text-emerald-500">保存しました</span>}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
