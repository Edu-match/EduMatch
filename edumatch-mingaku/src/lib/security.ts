/**
 * セキュリティユーティリティ
 * - safeRedirect: オープンリダイレクト防止
 * - checkPromptInjection: プロンプトインジェクション検出
 * - checkLlmOutput: LLM出力の個人情報・禁止コンテンツスキャン
 * - createRateLimiter: インメモリ sliding window レート制限
 * - timingSafeCompare: 秘密値の定数時間比較
 * - verifyCron: Cron ルート共通の認証
 * - getClientIp: プロキシヘッダーからのクライアントIP取得
 */

import { getRateLimiter } from "@/lib/rate-limit";
import type {
  RateLimitConfig as RateLimitConfigImpl,
  RateLimitResult as RateLimitResultImpl,
} from "@/lib/rate-limit";

// ─── Timing-safe Comparison ────────────────────────────────────────────────────

// middleware は Edge Runtime でもバンドルされるため、node:crypto を静的 import しない。
// process.getBuiltinModule はランタイム解決なのでバンドラーが Edge 向けに解決しようとしない。
type NodeCryptoModule = typeof import("node:crypto");
const nodeCrypto: NodeCryptoModule | undefined =
  typeof process !== "undefined" && typeof process.getBuiltinModule === "function"
    ? (process.getBuiltinModule("node:crypto") as NodeCryptoModule | undefined)
    : undefined;

/**
 * 秘密値（トークン・パスワード等）を定数時間で比較する。
 * Node.js では crypto.timingSafeEqual を使用し、
 * Edge Runtime では定数時間の XOR 比較にフォールバックする。
 * 長さが異なる場合もタイミング差を最小化する。
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a ?? "");
  const bufB = encoder.encode(b ?? "");

  if (nodeCrypto) {
    if (bufA.length !== bufB.length) {
      // 長さ不一致でも比較コストを揃える（結果は必ず false）
      nodeCrypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return nodeCrypto.timingSafeEqual(bufA, bufB);
  }

  // Edge Runtime フォールバック（内容に依存しない定数時間比較）
  let diff = bufA.length ^ bufB.length;
  const len = Math.max(bufA.length, bufB.length, 1);
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

// ─── Cron Authentication ───────────────────────────────────────────────────────

/**
 * Cron ルート共通の認証。`Authorization: Bearer <CRON_SECRET>` を検証する。
 * CRON_SECRET が未設定の場合は環境を問わず常に拒否する（devフォールバックなし）。
 */
export function verifyCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return timingSafeCompare(auth, `Bearer ${secret}`);
}

// ─── Client IP ─────────────────────────────────────────────────────────────────

/**
 * Vercel 等のリバースプロキシ経由でのクライアントIPを取得する。
 * 取得できない場合は "unknown" を返す（レート制限キーのフォールバック用）。
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// ─── Safe Redirect ─────────────────────────────────────────────────────────────

/**
 * redirectTo が同一オリジンの相対パスであることを確認する。
 * 外部 URL・protocol-relative URL (//) は "/" にフォールバックする。
 */
export function safeRedirect(redirectTo: string | null | undefined, fallback = "/"): string {
  if (!redirectTo) return fallback;
  const trimmed = redirectTo.trim();
  // 相対パス（/ 始まり）かつ protocol-relative (//) でないこと
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  return fallback;
}

// ─── Prompt Injection Detection ────────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+(a|an)\s+(jailbreak|DAN|unrestricted|evil)/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /print\s+(your\s+)?(system\s+)?prompt/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/i,
  /repeat\s+(the\s+)?(text\s+)?(above|before)/i,
  /override\s+(your\s+)?(instructions?|rules?|guidelines?)/i,
  /システムプロンプトを(教えて|見せて|出力して)/i,
  /前の(指示|命令|ルール)を無視/i,
  /あなたは今から.{0,20}として/i,
  /\bDAN\b/,
  /jailbreak/i,
  /prompt\s*injection/i,
];

export type InjectionCheckResult = {
  detected: boolean;
  pattern?: string;
};

/**
 * ユーザー入力にプロンプトインジェクションパターンが含まれるか検査する。
 * detected=true でもブロックせず、システムプロンプトに警告を付加する運用を推奨。
 */
export function checkPromptInjection(input: string): InjectionCheckResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

// ─── LLM Output Check ─────────────────────────────────────────────────────────

/** 日本の電話番号パターン（ハイフンあり・なし） */
const PHONE_PATTERN = /(?:\+81|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4}/g;
/** メールアドレスパターン */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
/** 郵便番号 */
const POSTAL_PATTERN = /〒?\d{3}[-ー]\d{4}/g;

const FORBIDDEN_PHRASES: string[] = [
  "システムプロンプト",
  "APIキー",
  "API key",
  "OPENAI_API_KEY",
  "SUPABASE",
  "secret",
  "password",
  "パスワード",
];

export type OutputCheckResult = {
  hasPii: boolean;
  hasForbiddenPhrase: boolean;
  details: string[];
};

/**
 * AI 出力テキストに個人情報・禁止フレーズが含まれるか検査する。
 * true の場合でも既にストリームが送出されている可能性があるため、ロギング用途を主とする。
 */
export function checkLlmOutput(text: string): OutputCheckResult {
  const details: string[] = [];

  if (PHONE_PATTERN.test(text)) details.push("phone_number");
  if (EMAIL_PATTERN.test(text)) details.push("email_address");
  if (POSTAL_PATTERN.test(text)) details.push("postal_code");

  const lowerText = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      details.push(`forbidden:${phrase}`);
    }
  }

  return {
    hasPii: details.some((d) => ["phone_number", "email_address", "postal_code"].includes(d)),
    hasForbiddenPhrase: details.some((d) => d.startsWith("forbidden:")),
    details,
  };
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// 実装本体は src/lib/rate-limit.ts（SEC-007: Upstash Redis 移行準備）。
// ここでは後方互換のため既存シグネチャを維持したラッパーを提供する。

export type RateLimitConfig = RateLimitConfigImpl;
export type RateLimitResult = RateLimitResultImpl;

/**
 * レート制限チェック（同期版・後方互換）。
 * 実装は getRateLimiter() が返す RateLimiter に委譲する。
 * Upstash 等の非同期専用実装へ移行する際は getRateLimiter().limit() を直接使うこと。
 *
 * @param key 識別子（IP アドレスや userId など）
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const limiter = getRateLimiter();
  if (typeof limiter.limitSync !== "function") {
    throw new Error(
      "checkRateLimit (sync) is not supported by the configured RateLimiter. Use getRateLimiter().limit() instead."
    );
  }
  return limiter.limitSync(key, config);
}

/**
 * Next.js Route Handler 向けのレート制限ヘルパー。
 * 制限超過時は { limited: true, response } を返す。
 */
export function rateLimitResponse(
  key: string,
  config: RateLimitConfig
): { limited: false } | { limited: true; response: Response } {
  const result = checkRateLimit(key, config);
  if (result.allowed) return { limited: false };

  return {
    limited: true,
    response: new Response(
      JSON.stringify({
        error: "リクエストが多すぎます。しばらくお待ちください。",
        retryAfter: result.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfterSec),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    ),
  };
}

// ─── Environment Gating (SEC-012) ─────────────────────────────────────────────

/**
 * 本番環境かどうか（Vercel の VERCEL_ENV を優先、なければ NODE_ENV）。
 */
export function isProductionEnv(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) return vercelEnv === "production";
  return process.env.NODE_ENV === "production";
}

/**
 * テスト/デバッグ用ルートの本番ガード。
 * 本番環境では 404 レスポンスを返し、それ以外では null を返す。
 *
 * 使い方:
 *   const blocked = requireNonProduction();
 *   if (blocked) return blocked;
 */
export function requireNonProduction(): Response | null {
  if (!isProductionEnv()) return null;
  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── CSRF: Origin Verification ────────────────────────────────────────────────

/**
 * 状態変更リクエスト（POST/PUT/PATCH/DELETE）の Origin ヘッダー検証（CSRF 対策）。
 *
 * - Origin ヘッダーがない場合（サーバー間通信・一部の古いクライアント）は許可
 * - Origin がリクエストの Host、NEXT_PUBLIC_SITE_URL、または localhost と
 *   一致すれば許可
 * - それ以外は拒否
 *
 * Webhook（Stripe 等）・Cron ルートには適用しないこと。
 *
 * 使い方:
 *   const csrf = verifyOrigin(request);
 *   if (csrf) return csrf; // 403
 */
export function verifyOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return originForbiddenResponse();
  }

  const allowedHosts = new Set<string>();

  // リクエスト自身の Host（プロキシ経由を考慮して x-forwarded-host も見る）
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) allowedHosts.add(forwardedHost.split(",")[0].trim());
  const hostHeader = request.headers.get("host");
  if (hostHeader) allowedHosts.add(hostHeader);
  try {
    allowedHosts.add(new URL(request.url).host);
  } catch {
    // ignore
  }

  // 環境変数で定義されたサイト URL
  for (const envUrl of [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined]) {
    if (!envUrl) continue;
    try {
      allowedHosts.add(new URL(envUrl).host);
    } catch {
      // ignore
    }
  }

  if (allowedHosts.has(originHost)) return null;

  // 開発環境の localhost は許可
  if (!isProductionEnv() && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHost)) {
    return null;
  }

  console.warn(`[security] Origin verification failed: origin=${originHost}`);
  return originForbiddenResponse();
}

function originForbiddenResponse(): Response {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
