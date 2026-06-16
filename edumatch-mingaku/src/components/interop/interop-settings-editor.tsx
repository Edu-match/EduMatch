"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/**
 * 表示設定。特設サイト(教育AIサミット)固有の項目（大見出し/開催情報/登録ボタン/位置情報の退出演出など）は
 * 井戸端では不要なので撤去し、井戸端マップに必要なものだけに絞っている。
 */
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

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/interop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    }).catch(() => null);
    setMsg(res?.ok
      ? { text: "保存しました。反映には数秒かかる場合があります。", ok: true }
      : { text: "保存に失敗しました。", ok: false });
    setSaving(false);
  };

  const di = "bg-white/[0.06] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-white/30";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-base font-semibold text-white">表示設定</h3>
      </div>
      <div className="space-y-4 p-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
        ) : (
          <>
            {msg && (
              <p className={`rounded-xl border px-3 py-2 text-sm font-medium ${msg.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
                {msg.text}
              </p>
            )}

            {/* 中心ハブ（中央の玉）の表示名 */}
            <label className="block text-sm">
              <span className="mb-1 block text-white/55">中心ハブ（中央の玉）の表示名</span>
              <Input
                value={settings.centerLabel}
                onChange={(e) => setSettings((s) => ({ ...s, centerLabel: e.target.value }))}
                placeholder="例：教育AIサミット＠衆議院第一議員会館"
                className={di}
              />
              <span className="mt-1 block text-xs text-white/40">マップ中央の大きな玉に表示される名前です。</span>
            </label>

            {/* マップ上部のガイド文 */}
            <label className="block text-sm">
              <span className="mb-1 block text-white/55">マップ上部のガイド文</span>
              <Input
                value={settings.guideText}
                onChange={(e) => setSettings((s) => ({ ...s, guideText: e.target.value }))}
                className={di}
              />
            </label>

            {/* 背景テーマ */}
            <label className="block text-sm">
              <span className="mb-1 block text-white/55">背景テーマ（時間帯）</span>
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
                          ? "border-indigo-400 bg-indigo-400/20 text-indigo-300"
                          : "border-white/15 text-white/40 hover:bg-white/[0.08] hover:text-white/80"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-white/40">「自動」は朝5–9時・昼9–16時・夕16–19時・夜19–5時で配色が切り替わります。</p>
            </label>

            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
