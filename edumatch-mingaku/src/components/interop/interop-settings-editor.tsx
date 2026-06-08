"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_INTEROP_SETTINGS,
  type InteropSettings,
  type InteropThemeMode,
} from "@/lib/interop-settings";

const THEME_OPTIONS: { value: InteropThemeMode; label: string }[] = [
  { value: "auto", label: "自動（時刻で切替）" },
  { value: "dawn", label: "朝" },
  { value: "day", label: "昼" },
  { value: "dusk", label: "夕" },
  { value: "night", label: "夜" },
];

const TEXT_FIELDS: { key: keyof InteropSettings; label: string; placeholder?: string }[] = [
  { key: "title", label: "大見出し" },
  { key: "subtitle", label: "小見出し" },
  { key: "dateVenue", label: "開催情報（日程・会場）" },
  { key: "registerLabel", label: "登録ボタンの文言" },
  { key: "registerUrl", label: "登録ボタンのリンク" },
  { key: "guideText", label: "マップ上部のガイド文" },
  { key: "footerCredit", label: "フッターのクレジット" },
];

export function InteropSettingsEditor() {
  const [settings, setSettings] = useState<InteropSettings>(DEFAULT_INTEROP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/interop/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setSettings({ ...DEFAULT_INTEROP_SETTINGS, ...d.settings }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof InteropSettings, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/interop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    }).catch(() => null);
    if (res?.ok) {
      setMsg({ text: "保存しました。反映には数秒かかる場合があります。", ok: true });
    } else {
      setMsg({ text: "保存に失敗しました。", ok: false });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">サイト設定（テキスト・背景テーマ）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {msg && (
              <p className={`rounded-md border px-3 py-2 text-sm font-medium ${msg.ok ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}>
                {msg.text}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {TEXT_FIELDS.map((f) => (
                <label key={f.key} className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{f.label}</span>
                  <Input
                    value={String(settings[f.key] ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </label>
              ))}
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">背景テーマ（時間帯）</span>
              <div className="flex flex-wrap gap-2">
                {THEME_OPTIONS.map((o) => {
                  const active = settings.themeMode === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, themeMode: o.value }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                「自動」は朝5–9時・昼9–16時・夕16–19時・夜19–5時で配色が切り替わります。
              </p>
            </label>

            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
