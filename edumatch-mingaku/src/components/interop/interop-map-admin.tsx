"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, Loader2, Plus, Trash2 } from "lucide-react";
import { MAJOR_META } from "@/lib/interop-priority-topics";
import { InteropContentAdmin } from "@/components/interop/interop-content-admin";

const di =
  "bg-white/[0.06] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 w-full";

type RawTopic = {
  id: string;
  no: number;
  major: string;
  name: string;
  roomId: string;
  topic1: string;
  topic2: string;
  topic3: string;
  url: string;
  axisX: number;
  axisY: number;
  sortOrder: number;
  isActive: boolean;
};

const MAJORS = Object.keys(MAJOR_META);

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function InteropMapAdmin() {
  const [topics, setTopics] = useState<RawTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [openMajor, setOpenMajor] = useState<Record<string, boolean>>({ A: true });
  const [openTopic, setOpenTopic] = useState<Record<string, boolean>>({});
  const [openSat, setOpenSat] = useState(false);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    if (ok) setTimeout(() => setMsg(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api("/api/interop/topics?all=true");
    setTopics((data.rawTopics ?? []) as RawTopic[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    if (!confirm("ハードコードの28玉を読み込みます（既存の同番号は内容で上書き）。よろしいですか？")) return;
    setBusy(true);
    const { ok, data } = await api("/api/interop/admin/seed-topics", { method: "POST" });
    setBusy(false);
    if (ok) { flash(`読み込み完了：新規${data.created}件／更新${data.updated}件`, true); load(); }
    else flash(data.error || "読み込みに失敗しました", false);
  };

  const patch = async (id: string, body: Partial<RawTopic>) => {
    const { ok, data } = await api(`/api/interop/topics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!ok) flash(data.error || "更新に失敗しました", false);
    return ok;
  };
  const update = (id: string, p: Partial<RawTopic>) =>
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...p } : t)));

  const remove = async (t: RawTopic) => {
    if (!confirm(`「${t.name}」を削除しますか？`)) return;
    const { ok } = await api(`/api/interop/topics/${t.id}`, { method: "DELETE" });
    if (ok) { setTopics((prev) => prev.filter((x) => x.id !== t.id)); flash("削除しました", true); }
  };

  const addNew = async (major: string) => {
    setBusy(true);
    const { ok, data } = await api("/api/interop/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新しい話題", major, axisX: 0, axisY: 0 }),
    });
    setBusy(false);
    if (ok) { flash("追加しました", true); setOpenTopic((p) => ({ ...p, [data.id]: true })); load(); }
    else flash(data.error || "追加に失敗しました", false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-white/80">マップ管理（分類 → 話題玉 → 論点）</p>
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-400/25 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          初期28玉を読み込む
        </button>
      </div>

      {msg && (
        <p className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${msg.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
          {msg.text}
        </p>
      )}

      {/* サテライト・掲示板投稿（折りたたみ） */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setOpenSat((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-white/85"
        >
          {openSat ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          サテライト・掲示板投稿
          <span className="text-[11px] font-normal text-white/40">最新ニュース／登壇者への質問／ご意見BOX</span>
        </button>
        {openSat && <div className="border-t border-white/10 p-3"><InteropContentAdmin /></div>}
      </div>

      {/* 分類 → 玉 → 論点 */}
      {loading ? (
        <div className="grid place-items-center py-10 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {MAJORS.map((mj) => {
            const meta = MAJOR_META[mj];
            const list = topics.filter((t) => t.major === mj).sort((a, b) => a.sortOrder - b.sortOrder || a.no - b.no);
            const open = !!openMajor[mj];
            return (
              <div key={mj} className="rounded-xl border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setOpenMajor((p) => ({ ...p, [mj]: !p[mj] }))}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                >
                  {open ? <ChevronDown className="h-4 w-4 text-white/60" /> : <ChevronRight className="h-4 w-4 text-white/60" />}
                  <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-[#15224e]" style={{ background: meta.color }}>{mj}</span>
                  <span className="text-sm font-bold text-white/85">{meta.label}</span>
                  <span className="text-[11px] text-white/40">{list.length}件</span>
                </button>

                {open && (
                  <div className="space-y-1.5 border-t border-white/10 p-2.5">
                    {list.map((t) => {
                      const to = !!openTopic[t.id];
                      return (
                        <div key={t.id} className="rounded-lg border border-white/10 bg-white/[0.04]">
                          <div className="flex items-center gap-2 px-2.5 py-2">
                            <button type="button" onClick={() => setOpenTopic((p) => ({ ...p, [t.id]: !p[t.id] }))} className="flex flex-1 items-center gap-2 text-left">
                              {to ? <ChevronDown className="h-3.5 w-3.5 text-white/50" /> : <ChevronRight className="h-3.5 w-3.5 text-white/50" />}
                              <span className="text-sm font-semibold text-white/90">{t.name || "（無題）"}</span>
                              {!t.isActive && <span className="rounded bg-white/10 px-1.5 text-[10px] text-white/45">非表示</span>}
                              {t.url && <span className="rounded bg-sky-400/15 px-1.5 text-[10px] text-sky-200">URL</span>}
                            </button>
                            <button type="button" onClick={() => remove(t)} className="grid h-7 w-7 place-items-center rounded text-red-300/70 hover:bg-red-400/10" aria-label="削除"><Trash2 className="h-4 w-4" /></button>
                          </div>

                          {to && (
                            <div className="space-y-2 border-t border-white/10 p-2.5">
                              <div className="flex items-center gap-2">
                                <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} onBlur={() => patch(t.id, { name: t.name })} className={di} placeholder="玉の名称" />
                                <label className="flex shrink-0 items-center gap-1 text-[11px] text-white/55">
                                  <input type="checkbox" checked={t.isActive} onChange={(e) => { update(t.id, { isActive: e.target.checked }); patch(t.id, { isActive: e.target.checked }); }} /> 表示
                                </label>
                              </div>

                              <label className="block text-[10px] text-white/45">参考URL（入れると論点ページの概要下にサムネ表示）
                                <input value={t.url} onChange={(e) => update(t.id, { url: e.target.value })} onBlur={() => patch(t.id, { url: t.url })} className={di} placeholder="https://..." />
                              </label>

                              <label className="block text-[10px] text-white/45">井戸端ルームID（/forum/＜id＞）
                                <input value={t.roomId} onChange={(e) => update(t.id, { roomId: e.target.value })} onBlur={() => patch(t.id, { roomId: t.roomId })} className={di} placeholder="room-..." />
                              </label>

                              <div className="space-y-1.5">
                                {([1, 2, 3] as const).map((n) => {
                                  const key = `topic${n}` as "topic1" | "topic2" | "topic3";
                                  return <input key={n} value={t[key]} onChange={(e) => update(t.id, { [key]: e.target.value })} onBlur={() => patch(t.id, { [key]: t[key] })} className={di} placeholder={`論点${n}`} />;
                                })}
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <label className="block text-[10px] text-white/45">分類
                                  <select value={t.major} onChange={(e) => { update(t.id, { major: e.target.value }); patch(t.id, { major: e.target.value }); }} className={di}>
                                    {MAJORS.map((m) => <option key={m} value={m} className="bg-[#0a1024]">{m}</option>)}
                                  </select>
                                </label>
                                <label className="block text-[10px] text-white/45">x（人間-1↔技術+1）
                                  <input type="number" step="0.05" min={-1} max={1} value={t.axisX} onChange={(e) => update(t.id, { axisX: Number(e.target.value) })} onBlur={() => patch(t.id, { axisX: t.axisX })} className={di} />
                                </label>
                                <label className="block text-[10px] text-white/45">y（現場-1↔制度+1）
                                  <input type="number" step="0.05" min={-1} max={1} value={t.axisY} onChange={(e) => update(t.id, { axisY: Number(e.target.value) })} onBlur={() => patch(t.id, { axisY: t.axisY })} className={di} />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => addNew(mj)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/12 disabled:opacity-50">
                      <Plus className="h-3.5 w-3.5" /> この分類に玉を追加
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
