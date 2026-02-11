import Stripe from "stripe";

// Stripeクライアントを遅延初期化（実際に使用される時だけ初期化）
let stripeInstance: Stripe | null = null;

function getStripeInstance(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

// 後方互換性のため、stripeもエクスポート（getterとして）
// 実際に使用される時だけ初期化される
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripeInstance();
    const value = instance[prop as keyof Stripe];
    // 関数の場合はthisをバインド
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
}) as Stripe;

/**
 * Stripe API 2025-01-27以降、current_period_endはSubscriptionItemに移動。
 * サブスクリプションの最初のitemからperiod endを取得するヘルパー。
 */
export function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): number {
  const item = subscription.items.data[0];
  return item?.current_period_end ?? Math.floor(Date.now() / 1000);
}

// プラン定義
export const PLANS = {
  FREE: {
    id: "FREE",
    name: "フリー",
    price: 0,
    priceId: null, // フリープランはStripe不要
    description: "基本機能を無料で利用できます",
    requestListLimit: 2, // 資料請求リストの制限
    features: [
      "記事閲覧（一部制限あり）",
      "サービス検索",
      "いいね機能",
      "資料請求リスト（2件まで）",
    ],
  },
  STANDARD: {
    id: "STANDARD",
    name: "スタンダード",
    price: 29800,
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || "",
    description: "すべての機能を利用できる標準プラン",
    requestListLimit: 5, // 資料請求リストの制限
    features: [
      "記事閲覧（無制限）",
      "サービス検索",
      "いいね機能",
      "資料請求リスト（5件まで）",
      "会員限定記事",
    ],
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "プレミアム",
    price: 50000,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || "",
    description: "大規模導入や高度な機能が必要な方へ",
    requestListLimit: 10, // 資料請求リストの制限
    features: [
      "記事閲覧（無制限）",
      "サービス検索",
      "いいね機能",
      "資料請求リスト（10件まで）",
      "会員限定記事",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanById(planId: string) {
  return PLANS[planId as PlanId] || null;
}

export function getPlanByPriceId(priceId: string) {
  return Object.values(PLANS).find((plan) => plan.priceId === priceId) || null;
}
