"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, ExternalLink, Loader2, Save, Newspaper, Mic, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SettingToggleRow } from "@/components/ui/toggle-switch";

/**
 * 井戸端 管理画面「サテライト管理」。
 * トップマップ直行の3サテライト（最新ニュース／登壇者への質問／ご意見BOX）を、
 * 表示ON/OFF（interop_settings のフラグ）・有効/無効（interop_sub_categories.is_active）・
 * 名前/参考URL（PATCH）でまとめて管理する。掲示板（投稿）への導線も。
 */

type Sub = { id: string; slug: string; name: string; url?: string; isActive?: boolean };

const SATS = [
  { slug: "interop-latest-news", label: "最新ニュース", flag: "showLatestNews", icon: Newspaper, color: "#7dd4fc" },
  { slug: "interop-speaker-qa", label: "登壇者への質問", flag: "showSpeakerQa", icon: Mic, color: "#fcd34d" },
  { slug: "interop-opinion-box", label: "ご意見BOX", flag: "showOpinionBox", icon: MessagesSquare, color: "#86efac" },
] as const;

type FlagKey = (typeof SATS)[number]["flag"];

export function AdminForumSatellites() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [flags, setFlags] = useState<Record<FlagKey, boolean> | null>(null);
  // 管理者ペルソナ自動返信の全体マスタースイッチ
  const [personaAutoReply, setPersonaAutoReply] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  // 編集中の name/url ドラフト（id単位）
  const [drafts, setDrafts] = useState<Record<string, { name: string; url: string }>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/interop/sub-categories?all=true", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/interop/settings", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([subRes, settings]) => {
      const list: Sub[] = Array.isArray(subRes.subCategories) ? subRes.subCategories : [];
      setSubs(list);
      const d: Record<string, { name: string; url: string }> = {};
      for (const s of list) d[s.id] = { name: s.name, url: s.url ?? "" };
      setDrafts(d);
      setFlags({
        showLatestNews: settings.showLatestNews ?? true,
        showSpeakerQa: settings.showSpeakerQa ?? true,
        showOpinionBox: settings.showOpinionBox ?? true,
      });
      setPersonaAutoReply(settings.personaAutoReplyEnabled ?? false);
    }).finally(() => setLoading(false));
  }, []);

  const setMasterAutoReply = async (value: boolean) => {
    setPersonaAutoReply(value);
    await fetch("/api/interop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ personaAutoReplyEnabled: value }),
    }).catch(() => {});
  };

  const subOf = (slug: string) =>
    subs.find((s) => s.slug === slug) ?? subs.find((s) => s.name.includes(slug.replace("interop-", "")));

  const setFlag = async (flag: FlagKey, value: boolean) => {
    setFlags((f) => (f ? { ...f, [flag]: value } : f));
    await fetch("/api/interop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ [flag]: value }),
    }).catch(() => {});
  };

  const patchSub = async (sub: Sub, patch: { isActive?: boolean; name?: string; url?: string }) => {
    setSavingId(sub.id);
    try {
      const res = await fetch(`/api/interop/sub-categories/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setSubs((prev) => prev.map((s) => (s.id === sub.id ? { ...s, ...patch } : s)));
      }
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* 管理者ペルソナ自動返信の全体マスタースイッチ。OFFなら個別有効でも自動返信しない。 */}
      {personaAutoReply !== null && (
        <SettingToggleRow
          checked={personaAutoReply}
          onCheckedChange={setMasterAutoReply}
          icon={Bot}
          title="管理者ペルソナの自動返信（全体）"
          description="オンにすると、自動返信を有効化している管理者ペルソナが投稿へ返信します。オフの間は誰の設定に関わらず自動返信しません。"
          activeClassName="border-violet-400/50 bg-violet-500/15"
          iconClassName={personaAutoReply ? "text-violet-300" : undefined}
        />
      )}

      <p className="text-sm text-muted-foreground">
        トップマップ直行の3サテライト。「マップに表示」で泡の表示を切り替え、名前・参考URLも編集できます。
      </p>
      {SATS.map((sat) => {
        const sub = subOf(sat.slug);
        const Icon = sat.icon;
        const draft = sub ? drafts[sub.id] : undefined;
        const dirty = !!sub && !!draft && (draft.name !== sub.name || draft.url !== (sub.url ?? ""));
        return (
          <Card key={sat.slug}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: `${sat.color}22`, color: sat.color }}>
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold">{sat.label}</h3>
                {!sub && <span className="text-xs text-destructive">（未作成: 特設データに見つかりません）</span>}
                {sub && (
                  <Link href={`/interop/t/${sub.id}`} target="_blank" className="ml-auto text-xs text-primary hover:underline">
                    <ExternalLink className="mr-1 inline h-3 w-3" />掲示板を見る
                  </Link>
                )}
              </div>

              {flags && (
                <SettingToggleRow
                  checked={flags[sat.flag] && sub?.isActive !== false}
                  onCheckedChange={(v) => { setFlag(sat.flag, v); if (sub) patchSub(sub, { isActive: v }); }}
                  icon={Icon}
                  title="表示する"
                  description="マップに泡を出し、掲示板も有効化します（オフで両方とも非表示・投稿受付も停止）。"
                />
              )}

              {sub && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs">
                      <span className="mb-1 block text-muted-foreground">表示名</span>
                      <Input
                        value={draft?.name ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [sub.id]: { ...d[sub.id], name: e.target.value } }))}
                      />
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block text-muted-foreground">参考URL（任意）</span>
                      <Input
                        value={draft?.url ?? ""}
                        placeholder="https://..."
                        onChange={(e) => setDrafts((d) => ({ ...d, [sub.id]: { ...d[sub.id], url: e.target.value } }))}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!dirty || savingId === sub.id}
                      onClick={() => draft && patchSub(sub, { name: draft.name.trim(), url: draft.url.trim() })}
                    >
                      {savingId === sub.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                      保存
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
