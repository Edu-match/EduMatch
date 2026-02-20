import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getCurrentSubscription } from "@/app/_actions/subscription";
import { PlanSelectButton } from "./plan-select-button";
import { FEATURES } from "@/lib/features";

const plans = [
  {
    id: "FREE",
    name: "フリー",
    price: "¥0",
    period: "永久無料",
    description: "基本機能を無料で利用できます",
    features: [
      { name: "記事閲覧（一部制限あり）", included: true },
      { name: "サービス検索", included: true },
      { name: "いいね機能", included: true },
      { name: "資料請求リスト（2件まで）", included: true },
      { name: "会員限定記事", included: false },
    ],
    popular: false,
  },
  {
    id: "STANDARD",
    name: "スタンダード",
    price: "¥29,800",
    period: "月額",
    description: "すべての機能を利用できる標準プラン",
    features: [
      { name: "記事閲覧（無制限）", included: true },
      { name: "サービス検索", included: true },
      { name: "いいね機能", included: true },
      { name: "資料請求リスト（5件まで）", included: true },
      { name: "会員限定記事", included: true },
    ],
    popular: true,
  },
  {
    id: "PREMIUM",
    name: "プレミアム",
    price: "¥50,000",
    period: "月額",
    description: "大規模導入や高度な機能が必要な方へ",
    features: [
      { name: "記事閲覧（無制限）", included: true },
      { name: "サービス検索", included: true },
      { name: "いいね機能", included: true },
      { name: "資料請求リスト（10件まで）", included: true },
      { name: "会員限定記事", included: true },
    ],
    popular: false,
  },
];

const faqs = [
  {
    question: "プランはいつでも変更できますか？",
    answer:
      "はい、いつでもプランの変更が可能です。アップグレードは即時反映、ダウングレードは次の請求サイクルから適用されます。",
  },
  {
    question: "解約した場合、データはどうなりますか？",
    answer:
      "解約後もデータは30日間保持されます。その間に再契約いただければ、データを復元できます。",
  },
  {
    question: "法人での一括契約は可能ですか？",
    answer:
      "はい、法人向けの一括契約プランをご用意しています。詳細はお問い合わせください。",
  },
  {
    question: "支払い方法は何がありますか？",
    answer:
      "クレジットカード（VISA, Mastercard, JCB, American Express）に対応しています。Stripeによる安全な決済処理を採用しています。",
  },
];

export default async function PlansPage() {
  if (!FEATURES.PAID_PLANS) {
    redirect("/");
  }

  const subscription = await getCurrentSubscription();
  const currentPlanId = subscription?.plan || "FREE";

  return (
    <div className="container py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">プラン選択</h1>
        <p className="text-lg text-muted-foreground">
          あなたに最適なプランをお選びください
        </p>
      </div>

      {/* プラン比較 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;

          return (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? "border-2 border-primary shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  人気No.1
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span
                        className={
                          feature.included ? "" : "text-muted-foreground/50"
                        }
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    現在のプラン
                  </Button>
                ) : plan.id === "FREE" ? (
                  subscription?.isActive ? (
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/dashboard/subscription">
                        ダウングレード
                      </Link>
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      現在のプラン
                    </Button>
                  )
                ) : (
                  <PlanSelectButton
                    planId={plan.id}
                    planName={plan.name}
                    hasSubscription={!!subscription?.stripeSubscriptionId}
                    popular={plan.popular}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 現在のサブスクリプション情報 */}
      {subscription && subscription.isActive && (
        <Card className="mb-12 bg-gradient-to-r from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">
                  現在のプラン: {subscription.planName}
                </h3>
                {subscription.currentPeriodEnd && (
                  <p className="text-muted-foreground">
                    次回請求日:{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                      "ja-JP",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  </p>
                )}
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/subscription">
                  サブスクリプション管理
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          よくある質問
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardContent className="p-4">
                <h3 className="font-bold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-6">
          <Button variant="link" asChild>
            <Link href="/faq">その他のFAQを見る</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
