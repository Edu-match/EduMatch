"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, MessagesSquare, Settings, ShieldAlert } from "lucide-react";
import { InteropSettingsEditor } from "@/components/interop/interop-settings-editor";
import { InteropModerationAdmin } from "@/components/interop/interop-moderation-admin";
import { InteropMapAdmin } from "@/components/interop/interop-map-admin";

type Tab = "settings" | "map" | "moderation";

const TABS: { key: Tab; label: string; icon: typeof Settings }[] = [
  { key: "map", label: "マップ管理", icon: LayoutGrid },
  { key: "moderation", label: "モデレーション", icon: ShieldAlert },
  { key: "settings", label: "サイト設定", icon: Settings },
];

export function InteropAdminTabs() {
  const [tab, setTab] = useState<Tab>("map");

  return (
    <div className="space-y-5">
      {/* 役割分担：部屋・サテライト・投稿の管理は「教育のひろば 管理」側。 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/70 backdrop-blur-sm">
        <span>部屋・サテライト・投稿の管理は</span>
        <Link href="/admin/forum" className="inline-flex items-center gap-1 rounded-md bg-white/[0.12] px-2 py-1 font-bold text-white hover:bg-white/20">
          <MessagesSquare className="h-3.5 w-3.5" />教育のひろば 管理
        </Link>
        <span>で。（こちらはマップ・軸・サイト設定・モデレーション）</span>
      </div>

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

      {tab === "map" && <InteropMapAdmin />}
      {tab === "moderation" && <InteropModerationAdmin />}
      {tab === "settings" && <InteropSettingsEditor />}
    </div>
  );
}
