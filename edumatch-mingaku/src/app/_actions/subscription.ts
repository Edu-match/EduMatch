"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/stripe";

export type SubscriptionInfo = {
  plan: PlanId | null;
  planName: string;
  status: string;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  isCanceled: boolean;
  isActive: boolean;
};

/**
 * 現在のサブスクリプション情報を取得
 */
export async function getCurrentSubscription(): Promise<SubscriptionInfo | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      subscription_plan: true,
      subscription_status: true,
      subscription_current_period_end: true,
      stripe_subscription_id: true,
      stripe_customer_id: true,
    },
  });

  if (!profile) return null;

  const planId = (profile.subscription_plan as PlanId) || "FREE";
  const plan = PLANS[planId] || PLANS.FREE;

  return {
    plan: planId,
    planName: plan.name,
    status: profile.subscription_status,
    currentPeriodEnd: profile.subscription_current_period_end,
    stripeSubscriptionId: profile.stripe_subscription_id,
    stripeCustomerId: profile.stripe_customer_id,
    isCanceled: profile.subscription_status === "CANCELED",
    isActive: profile.subscription_status === "ACTIVE",
  };
}

/**
 * Checkout Sessionを作成してURLを返す
 */
export async function createCheckoutSession(
  planId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { url: null, error: "認証が必要です" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/stripe/checkout`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { url: null, error: data.error || "エラーが発生しました" };
    }

    return { url: data.url, error: null };
  } catch (error) {
    console.error("createCheckoutSession error:", error);
    return { url: null, error: "決済セッションの作成に失敗しました" };
  }
}

/**
 * サブスクリプションをキャンセル
 */
export async function cancelSubscription(): Promise<{
  success: boolean;
  error: string | null;
  cancelAt: Date | null;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "認証が必要です", cancelAt: null };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/stripe/subscription`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "キャンセルに失敗しました",
        cancelAt: null,
      };
    }

    return {
      success: true,
      error: null,
      cancelAt: data.cancelAt ? new Date(data.cancelAt) : null,
    };
  } catch (error) {
    console.error("cancelSubscription error:", error);
    return {
      success: false,
      error: "サブスクリプションのキャンセルに失敗しました",
      cancelAt: null,
    };
  }
}

/**
 * プランを変更
 */
export async function updateSubscription(
  planId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/stripe/subscription`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "プラン変更に失敗しました" };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("updateSubscription error:", error);
    return { success: false, error: "プラン変更に失敗しました" };
  }
}
