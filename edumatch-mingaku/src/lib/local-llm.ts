import OpenAI from "openai";

/**
 * 安価なホスト型LLMクライアント（GPT を使うまでもない分類・判定タスク用）。
 *
 * 用途:
 *   - 軸座標の日次再計算 / 軸そのものの週次再設計（interop-axis-ai.ts）
 *   - 玉同士の内容ベースのノード接続（interop-topic-edges-ai.ts）
 *
 * OpenAI 互換エンドポイントを env で差し替えて使う。
 *   LOCAL_LLM_BASE_URL  例: https://api.groq.com/openai/v1
 *   LOCAL_LLM_API_KEY   そのプロバイダのキー
 *   LOCAL_LLM_MODEL     例: llama-3.1-8b-instant（Groq） / google/gemma-2-9b-it（OpenRouter）
 *
 * 未設定時は OPENAI_API_KEY があれば OpenAI へ自動フォールバックする
 * （fallbackModel を使用）。両方無ければ null。
 */
export type LocalLLM = { client: OpenAI; model: string; isLocal: boolean };

export function getLocalLLM(opts?: { fallbackModel?: string }): LocalLLM | null {
  const baseURL = process.env.LOCAL_LLM_BASE_URL?.trim();
  const model = process.env.LOCAL_LLM_MODEL?.trim();
  const key = process.env.LOCAL_LLM_API_KEY?.trim();
  if (baseURL && model) {
    // OpenAI 互換エンドポイント（Gemma）。apiKey が不要なローカルもあるのでダミーを許容。
    return { client: new OpenAI({ baseURL, apiKey: key || "local" }), model, isLocal: true };
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return { client: new OpenAI({ apiKey: openaiKey }), model: opts?.fallbackModel ?? "gpt-5.4", isLocal: false };
  }
  return null;
}

/**
 * LLM の生出力から最初の JSON（{...} または [...]）を取り出してパースする。
 * Gemma 等は JSON モード非対応のことがあり、コードフェンスや前置き文を伴う場合があるため、
 * response_format に依存せず寛容に抽出する。
 */
export function extractJson<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  // まず素直に
  try {
    return JSON.parse(text) as T;
  } catch {
    /* fallthrough */
  }
  // 最初の { … } / [ … ] を貪欲に抜き出す
  const startObj = text.indexOf("{");
  const startArr = text.indexOf("[");
  const start =
    startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr);
  if (start === -1) return null;
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  const end = text.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
