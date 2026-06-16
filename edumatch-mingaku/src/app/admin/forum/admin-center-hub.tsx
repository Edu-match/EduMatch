"use client";

import { useEffect, useState } from "react";
import { Landmark, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 中心ハブ（マップ中央の大きな玉）の管理。
 * 中央の玉＝議員会館ハブ。タップすると周囲のサテライト（最新ニュース/質問/ご意見）に展開する。
 * ここでは中央の玉に表示する名前を編集する（interop_settings.centerLabel）。
 */
export function AdminCenterHub() {
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/interop/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setLabel(d.settings.centerLabel ?? ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/interop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ centerLabel: label }),
    }).catch(() => null);
    if (res?.ok) { setSaved(true); window.setTimeout(() => setSaved(false), 2500); }
    else alert("保存に失敗しました");
    setSaving(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Landmark className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-bold">中心ハブ（中央の玉）</p>
          <p className="text-xs text-muted-foreground">マップ中央の大きな玉。タップで周囲のサテライト（最新ニュース・質問・ご意見）に展開します。</p>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1 text-xs">
            <span className="mb-1 block text-muted-foreground">中央の玉に表示する名前</span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例：教育AIサミット＠衆議院第一議員会館" />
          </label>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}保存
          </Button>
          {saved && <span className="text-xs text-emerald-500">保存しました</span>}
        </div>
      )}
    </div>
  );
}
