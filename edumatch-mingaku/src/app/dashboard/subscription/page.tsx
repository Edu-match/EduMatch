import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getCurrentSubscription } from "@/app/_actions/subscription";
import { PLANS } from "@/lib/stripe";
import { SubscriptionManagement } from "./subscription-management";
import { FEATURES } from "@/lib/features";

export default async function SubscriptionPage() {
  if (!FEATURES.PAID_PLANS) {
    redirect("/dashboard");
  }

  await requireAuth();
  const subscription = await getCurrentSubscription();

  if (!subscription) {
    redirect("/auth/login");
  }

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">サブスクリプション管理</h1>
        <p className="text-muted-foreground mb-8">
          プランの変更やキャンセルができます
        </p>

        <SubscriptionManagement
          subscription={JSON.parse(JSON.stringify(subscription))}
          plans={JSON.parse(JSON.stringify(PLANS))}
        />
      </div>
    </div>
  );
}
