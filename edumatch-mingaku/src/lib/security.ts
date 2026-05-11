/**
 * セキュリティユーティリティ
 * - safeRedirect: オープンリダイレクト防止
 * - checkPromptInjection: プロンプトインジェクション検出
 * - checkLlmOutput: LLM出力の個人情報・禁止コンテンツスキャン
 * - createRateLimiter: インメモリ sliding window レート制限
 */

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

// ─── In-memory Rate Limiter ────────────────────────────────────────────────────

type RateLimitEntry = { count: number; resetAt: number };

const rateLimitStore = new Map<string, RateLimitEntry>();

/** ストアの古いエントリを定期クリア（メモリリーク防止） */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}

let lastCleanup = Date.now();

export type RateLimitConfig = {
  /** ウィンドウ期間（ミリ秒） */
  windowMs: number;
  /** ウィンドウ内の最大リクエスト数 */
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

/**
 * インメモリ fixed window レート制限。
 * Vercel の同一インスタンス内でのみ有効（インスタンスをまたぐとリセットされる）。
 * 基本的な乱用防止として十分。厳密な制限が必要な場合は Upstash Redis を使用。
 *
 * @param key 識別子（IP アドレスや userId など）
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();

  // 定期クリア（5分に1回）
  if (now - lastCleanup > 5 * 60 * 1000) {
    cleanupRateLimitStore();
    lastCleanup = now;
  }

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt,
      retryAfterSec: 0,
    };
  }

  entry.count += 1;
  const allowed = entry.count <= config.max;
  const remaining = Math.max(0, config.max - entry.count);
  const retryAfterSec = allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000);

  return { allowed, remaining, resetAt: entry.resetAt, retryAfterSec };
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
