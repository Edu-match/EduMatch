/**
 * レート制限の抽象化レイヤー (SEC-007)
 *
 * - `RateLimiter` インターフェースでストレージ実装を差し替え可能にする
 * - `InMemoryRateLimiter`: 現行のインメモリ fixed window 実装
 *   （Vercel の同一インスタンス内でのみ有効。基本的な乱用防止用）
 * - `UpstashRateLimiter`: Upstash Redis 移行用スケルトン
 *   （UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 設定時に有効化予定）
 * - `getRateLimiter()`: 環境変数に応じて実装を返すファクトリ
 */

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

export interface RateLimiter {
  /**
   * @param key 識別子（IP アドレスや userId など）
   */
  limit(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  /** 同期版（インメモリ実装のみ対応）。非対応の実装では例外を投げてよい。 */
  limitSync?(key: string, config: RateLimitConfig): RateLimitResult;
}

// ─── In-memory implementation ─────────────────────────────────────────────────

type RateLimitEntry = { count: number; resetAt: number };

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private cleanupIntervalMs: number;

  constructor(options: { cleanupIntervalMs?: number } = {}) {
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? 5 * 60 * 1000;
  }

  /** 古いエントリを定期クリア（メモリリーク防止） */
  private cleanup(now: number) {
    if (now - this.lastCleanup <= this.cleanupIntervalMs) return;
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) this.store.delete(key);
    }
    this.lastCleanup = now;
  }

  limitSync(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    this.cleanup(now);

    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      const resetAt = now + config.windowMs;
      this.store.set(key, { count: 1, resetAt });
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

  async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.limitSync(key, config);
  }
}

// ─── Upstash Redis skeleton ───────────────────────────────────────────────────

/**
 * Upstash Redis ベースの分散レート制限（スケルトン）。
 *
 * 有効化手順:
 * 1. `npm install @upstash/redis @upstash/ratelimit`
 * 2. Vercel に UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN を設定
 * 3. 下記 TODO を実装（@upstash/ratelimit の slidingWindow を推奨）
 */
export class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string
  ) {}

  async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // TODO(SEC-007): @upstash/ratelimit を導入して実装する。
    // 例:
    //   const redis = new Redis({ url: this.restUrl, token: this.restToken });
    //   const ratelimit = new Ratelimit({
    //     redis,
    //     limiter: Ratelimit.slidingWindow(config.max, `${config.windowMs} ms`),
    //   });
    //   const { success, remaining, reset } = await ratelimit.limit(key);
    //   return { allowed: success, remaining, resetAt: reset, retryAfterSec: ... };
    void this.restUrl;
    void this.restToken;
    throw new Error(
      "UpstashRateLimiter is not implemented yet. Install @upstash/ratelimit and complete this method."
    );
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let sharedLimiter: RateLimiter | null = null;

/**
 * 環境に応じた RateLimiter を返す（プロセス内シングルトン）。
 * 現状は常にインメモリ実装。Upstash 実装完了後、環境変数があれば切り替える。
 */
export function getRateLimiter(): RateLimiter {
  if (sharedLimiter) return sharedLimiter;

  // TODO(SEC-007): UpstashRateLimiter 実装完了後に有効化する。
  // const url = process.env.UPSTASH_REDIS_REST_URL;
  // const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // if (url && token) {
  //   sharedLimiter = new UpstashRateLimiter(url, token);
  //   return sharedLimiter;
  // }

  sharedLimiter = new InMemoryRateLimiter();
  return sharedLimiter;
}
