"use client";

import { useState } from "react";
import { LayoutGrid, Settings, Sparkles } from "lucide-react";
import { InteropSettingsEditor } from "@/components/interop/interop-settings-editor";
import { InteropContentAdmin } from "@/components/interop/interop-content-admin";
import { InteropContentCurator } from "@/components/interop/interop-content-curator";

type Tab = "settings" | "map" | "content";

const TABS: { key: Tab; label: string; icon: typeof Settings }[] = [
  { key: "map", label: "マップ構成・投稿", icon: LayoutGrid },
  { key: "content", label: "コンテンツ", icon: Sparkles },
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
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold transition ${
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {msg && (
        <p className={`rounded-md border px-4 py-2 text-sm font-medium ${msg.ok ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      {tab === "map" && <InteropContentAdmin />}
      {tab === "content" && <InteropContentCurator onMsg={flash} />}
      {tab === "settings" && <InteropSettingsEditor />}
    </div>
  );
}
