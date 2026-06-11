"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Download } from "lucide-react";
import { MAJOR_META } from "@/lib/interop-priority-topics";

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

export function InteropTopicAdmin() {
  const [topics, setTopics] = useState<RawTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

  const seed = async () => {
    if (!confirm("ハードコードの28玉を読み込みます（既存の同番号は内容で上書き）。よろしいですか？")) return;
    setBusy(true);
    const { ok, data } = await api("/api/interop/admin/seed-topics", { method: "POST" });
    setBusy(false);
    if (ok) {
      flash(`読み込み完了：新規${data.created}件／更新${data.updated}件`, true);
      load();
    } else {
      flash(data.error || "読み込みに失敗しました", false);
    }
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

  const update = (id: string, patchObj: Partial<RawTopic>) =>
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patchObj } : t)));

  const remove = async (t: RawTopic) => {
    if (!confirm(`「${t.name}」を削除しますか？`)) return;
    const { ok, data } = await api(`/api/interop/topics/${t.id}`, { method: "DELETE" });
    if (ok) {
      setTopics((prev) => prev.filter((x) => x.id !== t.id));
      flash("削除しました", true);
    } else {
      flash(data.error || "削除に失敗しました", false);
    }
  };

  const addNew = async () => {
    setBusy(true);
    const { ok, data } = await api("/api/interop/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新しい話題", major: "F", axisX: 0, axisY: 0 }),
    });
    setBusy(false);
    if (ok) {
      flash("追加しました", true);
      load();
    } else {
      flash(data.error || "追加に失敗しました", false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-white/80">トップマップの話題玉（{topics.length}件）</p>
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-400/25 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          初期28玉を読み込む
        </button>
        <button
          type="button"
          onClick={addNew}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-white/85 transition hover:bg-white/15 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> 玉を追加
        </button>
      </div>

      {msg && (
        <p className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${msg.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
          {msg.text}
        </p>
      )}

      {loading ? (
        <div className="grid place-items-center py-12 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/55">
          まだ話題玉がありません。「初期28玉を読み込む」で既定の28玉を投入できます。
        </div>
      ) : (
        <ul className="space-y-3">
          {topics.map((t) => {
            const color = (MAJOR_META[t.major] ?? MAJOR_META.F).color;
            return (
              <li key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#15224e]" style={{ background: color }}>
                    {t.no}
                  </span>
                  <input
                    value={t.name}
                    onChange={(e) => update(t.id, { name: e.target.value })}
                    onBlur={() => patch(t.id, { name: t.name })}
                    className={di}
                    placeholder="玉の名称"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-white/55">
                    <input
                      type="checkbox"
                      checked={t.isActive}
                      onChange={(e) => { update(t.id, { isActive: e.target.checked }); patch(t.id, { isActive: e.target.checked }); }}
                    />
                    表示
                  </label>
                  <button type="button" onClick={() => remove(t)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-red-300/70 transition hover:bg-red-400/10 hover:text-red-300" aria-label="削除">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="flex flex-col gap-0.5 text-[10px] text-white/45">
                    分類（色）
                    <select
                      value={t.major}
                      onChange={(e) => { update(t.id, { major: e.target.value }); patch(t.id, { major: e.target.value }); }}
                      className={di}
                    >
                      {MAJORS.map((m) => (
                        <option key={m} value={m} className="bg-[#0a1024]">{m}：{MAJOR_META[m].label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5 text-[10px] text-white/45">
                    横軸 x（人間-1↔技術+1）
                    <input type="number" step="0.05" min={-1} max={1} value={t.axisX}
                      onChange={(e) => update(t.id, { axisX: Number(e.target.value) })}
                      onBlur={() => patch(t.id, { axisX: t.axisX })} className={di} />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[10px] text-white/45">
                    縦軸 y（現場-1↔制度+1）
                    <input type="number" step="0.05" min={-1} max={1} value={t.axisY}
                      onChange={(e) => update(t.id, { axisY: Number(e.target.value) })}
                      onBlur={() => patch(t.id, { axisY: t.axisY })} className={di} />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[10px] text-white/45">
                    並び順
                    <input type="number" value={t.sortOrder}
                      onChange={(e) => update(t.id, { sortOrder: Number(e.target.value) })}
                      onBlur={() => patch(t.id, { sortOrder: t.sortOrder })} className={di} />
                  </label>
                </div>

                <label className="mt-2 flex flex-col gap-0.5 text-[10px] text-white/45">
                  井戸端ルームID（/forum/＜id＞）
                  <input value={t.roomId} onChange={(e) => update(t.id, { roomId: e.target.value })}
                    onBlur={() => patch(t.id, { roomId: t.roomId })} className={di} placeholder="room-..." />
                </label>

                <div className="mt-2 space-y-1.5">
                  {([1, 2, 3] as const).map((n) => {
                    const key = `topic${n}` as "topic1" | "topic2" | "topic3";
                    return (
                      <input key={n} value={t[key]} onChange={(e) => update(t.id, { [key]: e.target.value })}
                        onBlur={() => patch(t.id, { [key]: t[key] })} className={di} placeholder={`論点${n}`} />
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
