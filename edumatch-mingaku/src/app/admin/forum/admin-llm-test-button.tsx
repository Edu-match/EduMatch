"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Plug, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Result = {
  ok: boolean;
  isLocal?: boolean;
  provider?: string;
  model?: string;
  latencyMs?: number;
  reply?: string;
  error?: string;
  note?: string;
  configured?: boolean;
};

/** 裏方LLM（Groq等）への実接続テスト。本番でGroqが効いているか（isLocal）を確認できる。 */
export function AdminLlmTestButton() {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  const run = async () => {
    setLoading(true);
    setRes(null);
    try {
      const r = await fetch("/api/interop/admin/test-llm", { method: "POST", credentials: "include" });
      setRes(await r.json());
    } catch {
      setRes({ ok: false, error: "リクエストに失敗しました" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold"><Plug className="h-4 w-4 text-primary" />AI接続テスト（裏方LLM）</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ノード接続・マップ分布見直し・関連コンテンツ検索に使うLLMへ実際に1回問い合わせます。本番でGroqが効いているか確認できます。
            </p>
          </div>
          <Button size="sm" onClick={run} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "テスト実行"}
          </Button>
        </div>

        {res && (
          <div className={`rounded-lg border p-3 text-xs ${res.ok ? "border-emerald-300/40 bg-emerald-500/10" : "border-rose-300/40 bg-rose-500/10"}`}>
            {res.ok ? (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />接続OK</p>
                <p>プロバイダ：<span className="font-medium">{res.provider}</span>{res.isLocal === false && <span className="ml-1 text-amber-500">（※Groq未適用＝OpenAIに戻っています）</span>}</p>
                <p>モデル：<span className="font-mono">{res.model}</span></p>
                <p>応答時間：{res.latencyMs}ms</p>
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
