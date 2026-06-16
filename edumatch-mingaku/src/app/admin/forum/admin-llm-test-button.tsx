"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Plug, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Result = {
  ok: boolean;
  isLocal?: boolean;
  provider?: string;
  model?: string;
  latencyMs?: number;
  reply?: string;
  axisChanged?: boolean;
  positionsUpdated?: number;
  positionsSkipped?: number;
  error?: string;
  note?: string;
  kind?: "ping" | "review";
};

/**
 * 裏方LLM（Groq等）の動作確認。
 * ・「接続テスト」＝1回だけ問い合わせて疎通とプロバイダを確認（速い）。
 * ・「投稿を読んで分布を見直す」＝週1の自動ジョブを手動実行。実際に投稿を読ませて
 *   軸の再評価＋トピック再配置を行い、処理件数で“本当に動いているか”を確認できる。
 */
export function AdminLlmTestButton() {
  const [loading, setLoading] = useState<null | "ping" | "review">(null);
  const [res, setRes] = useState<Result | null>(null);

  const call = async (kind: "ping" | "review") => {
    setLoading(kind);
    setRes(null);
    const url = kind === "ping"
      ? "/api/interop/admin/test-llm"
      : "/api/interop/admin/run-distribution-review";
    try {
      const r = await fetch(url, { method: "POST", credentials: "include" });
      setRes({ ...(await r.json()), kind });
    } catch {
      setRes({ ok: false, error: "リクエストに失敗しました", kind });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold"><Plug className="h-4 w-4 text-primary" />AI動作テスト（裏方LLM・Groq）</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ノード接続・マップ分布見直し・関連コンテンツ検索に使うLLM。本番でGroqが効いているか確認できます。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => call("ping")} disabled={loading !== null}>
            {loading === "ping" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plug className="mr-1.5 h-3.5 w-3.5" />}
            接続テスト
          </Button>
          <Button size="sm" onClick={() => call("review")} disabled={loading !== null} className="gap-1">
            {loading === "review" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
            投稿を読んで分布を見直す（手動実行）
          </Button>
        </div>
        {loading === "review" && <p className="text-[11px] text-muted-foreground">実際の投稿をLLMに読ませて軸・配置を再計算しています（数十秒かかることがあります）…</p>}

        {res && (
          <div className={`rounded-lg border p-3 text-xs ${res.ok ? "border-emerald-300/40 bg-emerald-500/10" : "border-rose-300/40 bg-rose-500/10"}`}>
            {res.ok ? (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />{res.kind === "review" ? "分布の見直しを実行しました" : "接続OK"}
                </p>
                <p>プロバイダ：<span className="font-medium">{res.provider}</span>{res.isLocal === false && <span className="ml-1 text-amber-500">（※Groq未適用＝OpenAIに戻っています）</span>}</p>
                <p>モデル：<span className="font-mono">{res.model}</span>／応答時間：{res.latencyMs}ms</p>
                {res.kind === "review" && (
                  <p>
                    実投稿を読んで <span className="font-semibold">{res.positionsUpdated}件</span> のトピックを再配置
                    {typeof res.positionsSkipped === "number" && `（投稿なし等でスキップ ${res.positionsSkipped}件）`}
                    ／軸の見直し：<span className="font-semibold">{res.axisChanged ? "変更あり" : "変更なし"}</span>
                  </p>
                )}
                {res.reply && <p>返答：「{res.reply}」</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400"><XCircle className="h-4 w-4" />失敗</p>
                <p>{res.error ?? res.note}</p>
                {res.model && <p>モデル：{res.model}</p>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
