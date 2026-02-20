import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Star, ExternalLink, Check, X, Building2 } from "lucide-react";

export default function ServiceDemoPage() {
  const service = {
    id: "demo",
    name: "ClassTech Pro",
    description:
      "授業管理と学習進捗を一元管理できるプラットフォーム。リアルタイムで生徒の理解度を把握し、個別最適化された学習支援を提供します。",
    fullDescription: `
ClassTech Proは、教育現場のデジタル変革を支援する総合的な学習管理プラットフォームです。

## 主な機能

### 授業管理
- 授業計画の作成・共有
- 教材の一元管理
- 出席管理の自動化
- 時間割の自動生成

### 学習進捗管理
- リアルタイムでの学習状況の可視化
- 個別の学習レポート自動生成
- 保護者への進捗共有
- 学習目標の設定と追跡

### 評価・分析
- 自動採点機能
- 詳細な学習分析レポート
- データドリブンな指導方針の提案
- クラス全体の傾向分析

### コミュニケーション
- 生徒・保護者とのメッセージ機能
- お知らせの一斉配信
- 面談記録の管理

## 導入事例

全国500校以上の学校で導入されており、学習効率の向上と業務の効率化を実現しています。

### 導入効果の一例
- 授業準備時間が30%削減
- 保護者との連絡時間が50%削減
- 学習分析による指導改善で、生徒の成績が平均10%向上
    `,
    image: "https://placehold.co/800x450/fef3c7/ca8a04?text=ClassTech+Pro",
    category: "学習管理",
    price: "月額 ¥5,000〜",
    rating: 4.8,
    reviews: 125,
    features: [
      "授業計画の作成・共有",
      "学習進捗の可視化",
      "自動採点機能",
      "保護者への進捗共有",
      "詳細な分析レポート",
      "モバイルアプリ対応",
      "API連携",
    ],
    pros: [
      "直感的なUIで使いやすい",
      "豊富な機能",
      "充実したサポート体制",
      "導入事例が豊富",
    ],
    cons: [
      "初期設定に時間がかかる",
      "高機能な分、価格がやや高め",
    ],
    website: "https://example.com/classtech",
    company: "ClassTech株式会社",
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/services">
            <ArrowLeft className="h-4 w-4 mr-2" />
            サービス一覧に戻る
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ヘッダー */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">{service.category}</Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{service.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({service.reviews}件のレビュー)
                </span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {service.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              {service.description}
            </p>
          </div>

          {/* メイン画像 */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden">
            <Image
              src={service.image}
              alt={service.name}
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          {/* 詳細説明 */}
          <Card>
            <CardHeader>
              <CardTitle>サービス詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                {service.fullDescription}
              </div>
            </CardContent>
          </Card>

          {/* 主な機能 */}
          <Card>
            <CardHeader>
              <CardTitle>主な機能</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {service.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* メリット・デメリット */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  メリット
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <X className="h-5 w-5 text-red-500" />
                  注意点
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500">×</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* デモページの説明 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-2">デモページについて</h2>
              <p className="text-muted-foreground">
                このページはサービス詳細ページのデモです。実際のサービスページと同じレイアウトと機能を持っています。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>料金</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary mb-4">
                {service.price}
              </p>
              <Button asChild className="w-full" size="lg">
                <Link href="/request-info">
                  資料請求する
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full mt-2">
                <Link href={service.website} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  公式サイトへ
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>提供企業</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <p className="font-semibold">{service.company}</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={service.website} target="_blank">
                  企業情報を見る
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>評価</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">{service.rating}</span>
                <span className="text-muted-foreground">
                  / 5.0 ({service.reviews}件)
                </span>
              </div>
              <Button variant="outline" className="w-full">
                レビューを見る
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
