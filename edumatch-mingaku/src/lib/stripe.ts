import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

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
    features: [
      "記事閲覧（一部制限あり）",
      "サービス検索",
      "お気に入り登録（10件まで）",
    ],
  },
  STANDARD: {
    id: "STANDARD",
    name: "スタンダード",
    price: 2980,
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || "",
    description: "すべての機能を利用できる標準プラン",
    features: [
      "記事閲覧（無制限）",
      "サービス検索",
      "お気に入り登録（無制限）",
      "会員限定記事",
      "詳細レポート",
    ],
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "プレミアム",
    price: 9800,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || "",
    description: "大規模導入や高度な機能が必要な方へ",
    features: [
      "記事閲覧（無制限）",
      "サービス検索",
      "お気に入り登録（無制限）",
      "会員限定記事",
      "詳細レポート",
      "優先サポート",
      "API連携",
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
