import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Building2,
  Users,
  TrendingUp,
  Star,
  MessageSquare,
  ArrowRight,
  Zap,
} from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "教育関係者へのリーチ",
    description:
      "教育ICTに関心の高い教員、管理職、教育委員会担当者など、質の高いユーザーにアプローチできます。",
  },
  {
    icon: TrendingUp,
    title: "導入検討の促進",
    description:
      "比較・検討段階にあるユーザーに対して、サービスの特長や導入事例を効果的に訴求できます。",
  },
  {
    icon: Star,
    title: "信頼性の向上",
    description:
      "実際の利用者によるレビューや導入事例を通じて、サービスの信頼性を高めることができます。",
  },
  {
    icon: MessageSquare,
    title: "直接のコンタクト",
    description:
      "資料請求やお問い合わせを通じて、興味関心の高いリードを獲得できます。",
  },
];

const plans = [
  {
    name: "フリー",
    price: "¥0",
    description: "まずは無料で掲載を開始",
    features: [
      "基本情報の掲載",
      "サービス検索への表示",
      "月5件までの資料請求受付",
    ],
    notIncluded: [
      "おすすめ枠への表示",
      "詳細な分析レポート",
      "優先サポート",
    ],
    cta: "無料で始める",
    popular: false,
  },
  {
    name: "スタンダード",
    price: "¥29,800",
    period: "/月",
    description: "本格的な集客を始めたい方に",
    features: [
      "フリープランの全機能",
      "無制限の資料請求受付",
      "導入事例の掲載",
      "詳細な分析レポート",
      "担当者サポート",
    ],
    notIncluded: ["おすすめ枠への表示"],
    cta: "お申し込み",
    popular: true,
  },
  {
    name: "プレミアム",
    price: "¥98,000",
    period: "/月",
    description: "最大限の露出と集客を実現",
    features: [
      "スタンダードの全機能",
      "おすすめ枠への優先表示",
      "特集記事の掲載",
      "バナー広告枠",
      "専任担当者サポート",
      "効果測定レポート",
    ],
    notIncluded: [],
    cta: "お問い合わせ",
    popular: false,
  },
];

const stats = [
  { label: "月間ユーザー数", value: "50,000+" },
  { label: "掲載サービス数", value: "500+" },
  { label: "資料請求数/月", value: "3,000+" },
  { label: "導入事例掲載数", value: "200+" },
];

export default function ListingPage() {
  if (!FEATURES.LISTING_REGISTRATION) {
    redirect("/");
  }

  return (
    <div className="container py-8">
      {/* ヒーロー */}
      <div className="text-center mb-16 py-12">
        <Badge className="mb-4">EdTech事業者様向け</Badge>
        <h1 className="text-4xl font-bold mb-4">
          エデュマッチにサービスを掲載しませんか？
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          教育現場で導入を検討している教育関係者に、
          <br />
          あなたのサービスを直接アプローチできます。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" className="gap-2">
            <Zap className="h-5 w-5" />
            無料で掲載を始める
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/contact">お問い合わせ</Link>
          </Button>
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* メリット */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">掲載のメリット</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Card key={benefit.title}>
                <CardContent className="p-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 料金プラン */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">掲載プラン</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? "border-2 border-primary shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  おすすめ
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {plan.notIncluded.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground/50"
                    >
                      <Check className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 掲載の流れ */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">掲載までの流れ</h2>
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "お申し込み",
                description:
                  "フォームから必要事項を入力してお申し込みください。",
              },
              {
                step: 2,
                title: "審査",
                description:
                  "当社にて内容を確認させていただきます（通常3営業日以内）。",
              },
              {
                step: 3,
                title: "掲載情報の登録",
                description:
                  "管理画面からサービス情報、導入事例などを登録します。",
              },
              {
                step: 4,
                title: "掲載開始",
                description:
                  "審査完了後、エデュマッチにサービスが掲載されます。",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">
            まずは無料で掲載を始めましょう
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            フリープランなら初期費用・月額費用なしで掲載できます。
            まずは効果を実感してください。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="gap-2">
              無料で掲載を始める
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">詳しく相談する</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
