"use client";

import { useState } from "react";
import { LayoutGrid, Settings, ShieldAlert, Sparkles } from "lucide-react";
import { InteropSettingsEditor } from "@/components/interop/interop-settings-editor";
import { InteropContentAdmin } from "@/components/interop/interop-content-admin";
import { InteropContentCurator } from "@/components/interop/interop-content-curator";
import { InteropModerationAdmin } from "@/components/interop/interop-moderation-admin";

type Tab = "settings" | "map" | "content" | "moderation";

const TABS: { key: Tab; label: string; icon: typeof Settings }[] = [
  { key: "map", label: "マップ構成・投稿", icon: LayoutGrid },
  { key: "content", label: "コンテンツ", icon: Sparkles },
  { key: "moderation", label: "モデレーション", icon: ShieldAlert },
  { key: "settings", label: "サイト設定", icon: Settings },
];

export function InteropAdminTabs() {
  const [tab, setTab] = useState<Tab>("map");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    if (ok) setTimeout(() => setMsg(null), 2500);
  };

  return (
    <div className="space-y-5">
      {/* タブ */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.06] p-1 backdrop-blur-sm">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
                active ? "bg-white/[0.14] text-white shadow-sm" : "text-white/50 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {msg && (
        <p className={`rounded-xl border px-4 py-2 text-sm font-medium ${msg.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
          {msg.text}
        </p>
      )}

      {tab === "map" && <InteropContentAdmin />}
      {tab === "content" && <InteropContentCurator onMsg={flash} />}
      {tab === "moderation" && <InteropModerationAdmin />}
      {tab === "settings" && <InteropSettingsEditor />}
    </div>
  );
}
