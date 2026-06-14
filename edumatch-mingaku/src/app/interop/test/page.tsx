"use client";

import { useEffect, useState } from "react";

/**
 * Interop AIパイプライン動作テストページ（開発・管理者向け）。
 *   - GET  /api/interop/admin/test-ai … 各AI機能の設定状況
 *   - POST /api/interop/admin/test-ai … モデレーション＋AI返信を同期実行（DB書き込みなし）
 *
 * 本番では管理者のみアクセス可（API側でガード）。ローカルでは誰でも利用可。
 */

type Health = {
  env: string;
  aiFacilitator: { configured: boolean; model: string; note: string };
  moderation: { configured: boolean; note: string };
  lightLLM: { configured: boolean; model: string | null; isLocal: boolean; note: string };
};

type RunResult = {
  moderation?: {
    skipped?: boolean;
    allowed?: boolean;
    toneFlag?: string;
    toneReason?: string;
    slackAlert?: boolean;
    summaryJa?: string;
    wouldAutoHide?: boolean;
    elapsedMs?: number;
    error?: string;
  };
  aiReply?: {
    facilitatorName: string;
    model: string;
    generated: boolean;
    body: string | null;
    elapsedMs: number;
    note: string | null;
  };
  error?: string;
};

const SAMPLES = [
  "AIを使った個別最適化って、結局できる子とできない子の差を広げませんか？現場では時間も人も足りていません。",
  "デジタル教科書、うちの学校でも導入が決まりました。子どもたちが楽しそうに使っていて良い変化を感じます。",
  "こんなイベント意味ないだろ。どうせ業者の宣伝ばかりで税金の無駄。",
];

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
      }`}
    >
      {ok ? "● 有効" : "○ 未設定"} {children}
    </span>
  );
}

export default function InteropAiTestPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [body, setBody] = useState(SAMPLES[0]);
  const [subCategoryName, setSubCategoryName] = useState("Education×AIゾーン");
  const [categoryName, setCategoryName] = useState("インタロップ");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/interop/admin/test-ai")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setHealth)
      .catch(() => setErr("ヘルスチェック取得失敗（本番は管理者ログインが必要）"));
  }, []);

  async function run() {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/interop/admin/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, subCategoryName, categoryName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "実行に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-xl font-bold">Interop AI 動作テスト</h1>
          <p className="mt-1 text-sm text-slate-400">
            投稿のモデレーション審査とAIファシリテーター返信を同期実行します（DBには書き込みません）。
          </p>
        </header>

        {/* ヘルスチェック */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">AI機能の設定状況</h2>
          {health ? (
            <ul className="space-y-2 text-sm">
              <li className="flex flex-wrap items-center gap-2">
                <Badge ok={health.aiFacilitator.configured}>AIファシリテーター返信</Badge>
                <span className="text-slate-400">{health.aiFacilitator.model}</span>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <Badge ok={health.moderation.configured}>投稿モデレーション</Badge>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <Badge ok={health.lightLLM.configured}>軽量LLM（軸/ノード）</Badge>
                <span className="text-slate-400">{health.lightLLM.model ?? "—"}</span>
              </li>
              <li className="pt-1 text-xs text-slate-500">env: {health.env}</li>
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{err ?? "読み込み中…"}</p>
          )}
        </section>

        {/* 入力 */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              カテゴリ名
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              サブカテゴリ名
              <input
                value={subCategoryName}
                onChange={(e) => setSubCategoryName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
          </div>
          <label className="block text-xs text-slate-400">
            投稿本文
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s, i) => (
              <button
                key={i}
                onClick={() => setBody(s)}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                サンプル{i + 1}
                {i === 0 ? "（課題）" : i === 1 ? "（前向き）" : "（不適切）"}
              </button>
            ))}
          </div>
          <button
            onClick={run}
            disabled={loading || !body.trim()}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "実行中…" : "AIパイプラインを実行"}
          </button>
          {err && <p className="text-sm text-rose-400">{err}</p>}
        </section>

        {/* 結果 */}
        {result && (
          <section className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                モデレーション結果{" "}
                {result.moderation?.elapsedMs != null && (
                  <span className="text-xs font-normal text-slate-500">
                    ({result.moderation.elapsedMs}ms)
                  </span>
                )}
              </h3>
              {result.moderation?.error ? (
                <p className="text-sm text-rose-400">{result.moderation.error}</p>
              ) : result.moderation?.skipped ? (
                <p className="text-sm text-amber-300">審査スキップ（APIキー未設定）</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  <li>
                    掲載可否:{" "}
                    <span className={result.moderation?.allowed ? "text-emerald-300" : "text-rose-300"}>
                      {result.moderation?.allowed ? "許可" : "不許可（自動非表示）"}
                    </span>
                  </li>
                  <li>トーン: <span className="text-slate-300">{result.moderation?.toneFlag}</span></li>
                  {result.moderation?.toneReason && (
                    <li className="text-slate-400">理由: {result.moderation.toneReason}</li>
                  )}
                  <li>運営アラート: {result.moderation?.slackAlert ? "あり" : "なし"}</li>
                  {result.moderation?.summaryJa && (
                    <li className="text-slate-400">要約: {result.moderation.summaryJa}</li>
                  )}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                AIファシリテーター返信{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({result.aiReply?.model} / {result.aiReply?.elapsedMs}ms)
                </span>
              </h3>
              {result.aiReply?.generated ? (
                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="mb-1 text-xs font-bold text-emerald-300">
                    🤖 {result.aiReply.facilitatorName}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-slate-200">{result.aiReply.body}</p>
                </div>
              ) : (
                <p className="text-sm text-amber-300">{result.aiReply?.note}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
