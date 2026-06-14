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

  const di = "bg-white/[0.06] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:border-white/30";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-base font-semibold text-white">サイト設定（テキスト・背景テーマ）</h3>
      </div>
      <div className="space-y-4 p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            {msg && (
              <p className={`rounded-xl border px-3 py-2 text-sm font-medium ${msg.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
                {msg.text}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {TEXT_FIELDS.map((f) => (
                <label key={f.key} className="text-sm">
                  <span className="mb-1 block text-white/55">{f.label}</span>
                  <Input
                    value={String(settings[f.key] ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={di}
                  />
                </label>
              ))}
            </div>

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
              <p className="mt-1.5 text-xs text-white/40">
                「自動」は朝5–9時・昼9–16時・夕16–19時・夜19–5時で配色が切り替わります。
              </p>
            </label>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="mb-2 text-sm font-bold text-white/80">トップマップのサテライト表示</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-white/75">
                  <input type="checkbox" checked={settings.showLatestNews}
                    onChange={(e) => setSettings((s) => ({ ...s, showLatestNews: e.target.checked }))} />
                  最新ニュース（左上）
                </label>
                <label className="flex items-center gap-2 text-sm text-white/75">
                  <input type="checkbox" checked={settings.showSpeakerQa}
                    onChange={(e) => setSettings((s) => ({ ...s, showSpeakerQa: e.target.checked }))} />
                  登壇者への質問（右上）
                </label>
                <label className="flex items-center gap-2 text-sm text-white/75">
                  <input type="checkbox" checked={settings.showOpinionBox}
                    onChange={(e) => setSettings((s) => ({ ...s, showOpinionBox: e.target.checked }))} />
                  ご意見BOX（下）
                </label>
              </div>
              <p className="mt-1.5 text-xs text-white/40">
                特設由来の3面。オフにするとマップ上のその玉を隠します（投稿データは保持）。
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <label className="flex items-center gap-2 text-sm font-bold text-white/80">
                <input type="checkbox" checked={settings.geofenceEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, geofenceEnabled: e.target.checked }))} />
                会場を出たときの演出を有効にする（位置情報）
              </label>
              <p className="mt-1 text-xs text-white/40">
                来場者が会場（中心座標＋半径）の外に出た瞬間に、バイブと「世界を出た」演出＋登録案内を表示します。
                端末で <code className="text-violet-300">?exitpreview=1</code> を付けて開くと演出をプレビューできます。※iOSはバイブ非対応。
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-sm"><span className="mb-1 block text-white/55">中心緯度</span>
                  <Input type="number" step="0.0001" value={settings.venueLat}
                    onChange={(e) => setSettings((s) => ({ ...s, venueLat: Number(e.target.value) }))} className={di} /></label>
                <label className="text-sm"><span className="mb-1 block text-white/55">中心経度</span>
                  <Input type="number" step="0.0001" value={settings.venueLng}
                    onChange={(e) => setSettings((s) => ({ ...s, venueLng: Number(e.target.value) }))} className={di} /></label>
                <label className="text-sm"><span className="mb-1 block text-white/55">半径（m）</span>
                  <Input type="number" step="50" value={settings.venueRadiusM}
                    onChange={(e) => setSettings((s) => ({ ...s, venueRadiusM: Number(e.target.value) }))} className={di} /></label>
              </div>

              <div className="mt-3 space-y-2">
                <label className="block text-sm"><span className="mb-1 block text-white/55">退出メッセージ見出し</span>
                  <Input value={settings.exitTitle} onChange={(e) => setSettings((s) => ({ ...s, exitTitle: e.target.value }))} className={di} /></label>
                <label className="block text-sm"><span className="mb-1 block text-white/55">退出メッセージ本文</span>
                  <textarea value={settings.exitMessage} rows={3}
                    onChange={(e) => setSettings((s) => ({ ...s, exitMessage: e.target.value }))}
                    className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm"><span className="mb-1 block text-white/55">CTAの文言</span>
                    <Input value={settings.exitCtaLabel} onChange={(e) => setSettings((s) => ({ ...s, exitCtaLabel: e.target.value }))} className={di} /></label>
                  <label className="text-sm"><span className="mb-1 block text-white/55">CTAのリンク</span>
                    <Input value={settings.exitCtaUrl} onChange={(e) => setSettings((s) => ({ ...s, exitCtaUrl: e.target.value }))} className={di} /></label>
                </div>
              </div>
            </div>

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
