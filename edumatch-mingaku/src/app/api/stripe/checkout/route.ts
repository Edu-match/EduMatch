import { NextRequest, NextResponse } from "next/server";
import { stripe, getPlanById } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { planId } = await request.json();
    const plan = getPlanById(planId);

    if (!plan || !plan.priceId) {
      return NextResponse.json(
        { error: "無効なプランです" },
        { status: 400 }
      );
    }

    // プロフィール取得
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "プロフィールが見つかりません" },
        { status: 404 }
      );
    }

    // Stripe顧客IDがない場合は作成
    let stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.name,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      await prisma.profile.update({
        where: { id: user.id },
        data: { stripe_customer_id: stripeCustomerId },
      });
    }

    // 既存のサブスクリプションがある場合はBilling Portalにリダイレクト
    if (profile.stripe_subscription_id && profile.subscription_status === "ACTIVE") {
      const billingPortal = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/subscription`,
      });

      return NextResponse.json({ url: billingPortal.url });
    }

    // Checkout Session作成
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      locale: "ja",
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
        },
      },
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
