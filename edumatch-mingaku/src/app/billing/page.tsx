import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Receipt } from "lucide-react";

const plans = [
  {
    name: "スターター",
    price: "¥0",
    description: "基本機能を無料で試せます",
    features: ["記事閲覧", "サービス検索", "お気に入り登録"],
    popular: false,
  },
  {
    name: "プロ",
    price: "¥29,800/月",
    description: "教育現場向けの標準プラン",
    features: [
      "すべてのスターター機能",
      "レポート出力",
      "優先サポート",
      "チーム管理",
    ],
    popular: true,
  },
  {
    name: "エンタープライズ",
    price: "お問い合わせ",
    description: "大規模導入向け",
    features: ["すべてのプロ機能", "専任サポート", "カスタム連携"],
    popular: false,
  },
];

export default function BillingPage() {
  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">課金・プラン</h1>
        <p className="text-muted-foreground">
          学校規模や用途に合わせたプランをお選びください
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.popular ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.popular && <Badge>人気</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full">
                {plan.price === "お問い合わせ" ? "相談する" : "プランを選択"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              お支払い方法
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>・クレジットカード</p>
            <p>・請求書払い（法人のみ）</p>
            <p>・銀行振込</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              請求書・領収書
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>請求書の発行、領収書のダウンロードに対応しています。</p>
            <Button variant="outline" size="sm">
              請求書を確認
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
