import { NextRequest, NextResponse } from "next/server";
import { stripe, getSubscriptionPeriodEnd } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// サブスクリプションキャンセル
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "アクティブなサブスクリプションがありません" },
        { status: 400 }
      );
    }

    // 期間終了時にキャンセル（即時解約ではない）
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    const periodEnd = getSubscriptionPeriodEnd(subscription);

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        subscription_status: "CANCELED",
        subscription_current_period_end: new Date(periodEnd * 1000),
      },
    });

    return NextResponse.json({
      message: "サブスクリプションのキャンセルが完了しました。現在の期間終了まで引き続きご利用いただけます。",
      cancelAt: new Date(periodEnd * 1000),
    });
  } catch (error) {
    console.error("Subscription cancel error:", error);
    return NextResponse.json(
      { error: "サブスクリプションのキャンセルに失敗しました" },
      { status: 500 }
    );
  }
}

// サブスクリプション再開（キャンセル取り消し）
export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "サブスクリプションが見つかりません" },
        { status: 400 }
      );
    }

    // キャンセル取り消し
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    const periodEnd = getSubscriptionPeriodEnd(subscription);

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        subscription_status: "ACTIVE",
        subscription_current_period_end: new Date(periodEnd * 1000),
      },
    });

    return NextResponse.json({
      message: "サブスクリプションが再開されました。",
    });
  } catch (error) {
    console.error("Subscription resume error:", error);
    return NextResponse.json(
      { error: "サブスクリプションの再開に失敗しました" },
      { status: 500 }
    );
  }
}

// プラン変更
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { planId } = await request.json();

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "アクティブなサブスクリプションがありません" },
        { status: 400 }
      );
    }

    // 新しいプランのPrice IDを取得
    const { getPlanById } = await import("@/lib/stripe");
    const plan = getPlanById(planId);

    if (!plan || !plan.priceId) {
      return NextResponse.json(
        { error: "無効なプランです" },
        { status: 400 }
      );
    }

    // 現在のサブスクリプション取得
    const currentSubscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    );

    // プラン変更（即時反映、日割り計算）
    const updatedSubscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: plan.priceId,
          },
        ],
        proration_behavior: "create_prorations",
      }
    );

    const periodEnd = getSubscriptionPeriodEnd(updatedSubscription);

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        subscription_plan: plan.id,
        subscription_status: "ACTIVE",
        subscription_current_period_end: new Date(periodEnd * 1000),
      },
    });

    return NextResponse.json({
      message: `${plan.name}プランに変更しました。`,
      plan: plan.id,
    });
  } catch (error) {
    console.error("Subscription update error:", error);
    return NextResponse.json(
      { error: "プラン変更に失敗しました" },
      { status: 500 }
    );
  }
}
