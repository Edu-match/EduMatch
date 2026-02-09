import { NextRequest, NextResponse } from "next/server";
import { stripe, getPlanByPriceId, getSubscriptionPeriodEnd } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// Webhook用にbody parserを無効化
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing stripe-signature header");
    return NextResponse.json(
      { error: "署名がありません" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("Missing userId or subscriptionId in checkout session");
    return;
  }

  // サブスクリプション詳細取得
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? getPlanByPriceId(priceId) : null;
  const periodEnd = getSubscriptionPeriodEnd(subscription);

  await prisma.profile.update({
    where: { id: userId },
    data: {
      stripe_subscription_id: subscriptionId,
      subscription_plan: plan?.id || session.metadata?.planId || "STANDARD",
      subscription_status: "ACTIVE",
      subscription_current_period_end: new Date(periodEnd * 1000),
    },
  });

  console.log(`Subscription created for user ${userId}: ${plan?.name || "Unknown"}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const profile = await prisma.profile.findFirst({
    where: { stripe_customer_id: customerId },
  });

  if (!profile) {
    console.error(`Profile not found for customer ${customerId}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? getPlanByPriceId(priceId) : null;
  const periodEnd = getSubscriptionPeriodEnd(subscription);

  let subscriptionStatus: string;
  switch (subscription.status) {
    case "active":
      subscriptionStatus = "ACTIVE";
      break;
    case "canceled":
      subscriptionStatus = "CANCELED";
      break;
    case "past_due":
      subscriptionStatus = "PAST_DUE";
      break;
    default:
      subscriptionStatus = "INACTIVE";
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      subscription_plan: plan?.id || profile.subscription_plan,
      subscription_status: subscriptionStatus,
      subscription_current_period_end: new Date(periodEnd * 1000),
    },
  });

  console.log(
    `Subscription updated for user ${profile.id}: status=${subscriptionStatus}, plan=${plan?.name || "Unknown"}`
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const profile = await prisma.profile.findFirst({
    where: { stripe_customer_id: customerId },
  });

  if (!profile) {
    console.error(`Profile not found for customer ${customerId}`);
    return;
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      subscription_plan: "FREE",
      subscription_status: "CANCELED",
      stripe_subscription_id: null,
      subscription_current_period_end: null,
    },
  });

  console.log(`Subscription deleted for user ${profile.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const profile = await prisma.profile.findFirst({
    where: { stripe_customer_id: customerId },
  });

  if (!profile) {
    console.error(`Profile not found for customer ${customerId}`);
    return;
  }

  // 支払い成功 - ステータスをACTIVEに更新
  if (profile.subscription_status !== "ACTIVE") {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { subscription_status: "ACTIVE" },
    });
  }

  console.log(`Invoice payment succeeded for user ${profile.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const profile = await prisma.profile.findFirst({
    where: { stripe_customer_id: customerId },
  });

  if (!profile) {
    console.error(`Profile not found for customer ${customerId}`);
    return;
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { subscription_status: "PAST_DUE" },
  });

  console.log(`Invoice payment failed for user ${profile.id}`);
}
