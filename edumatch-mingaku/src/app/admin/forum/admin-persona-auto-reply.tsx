"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { SettingToggleRow } from "@/components/ui/toggle-switch";

/** 管理者ペルソナ自動返信の全体マスタースイッチ（interop_settings.personaAutoReplyEnabled）。 */
export function AdminPersonaAutoReply() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/interop/settings")
      .then((r) => r.json())
      .then((d) => setOn(d.settings?.personaAutoReplyEnabled ?? false))
      .catch(() => setOn(false));
  }, []);

  const toggle = async (v: boolean) => {
    setOn(v);
    await fetch("/api/interop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ personaAutoReplyEnabled: v }),
    }).catch(() => {});
  };

  if (on === null) return null;
  return (
    <div className="rounded-lg border bg-card p-4">
      <SettingToggleRow
        checked={on}
        onCheckedChange={toggle}
        icon={Bot}
        title="管理者ペルソナの自動返信（全体）"
        description="オンにすると、自動返信を有効化している管理者ペルソナが投稿へ返信します。オフの間は誰の設定に関わらず自動返信しません。"
        activeClassName="border-violet-400/50 bg-violet-500/15"
        iconClassName={on ? "text-violet-300" : undefined}
      />
    </div>
  );
}
