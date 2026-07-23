import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Tag, ArrowLeft, Share2, Clock, User } from "lucide-react";

export default function ArticleDemoPage() {
  const article = {
    id: "demo",
    title: "EdTechツール選びの完全ガイド：2024年最新版",
    content: `
# EdTechツール選びの完全ガイド：2024年最新版

教育現場でEdTechツールを導入する際、数多くの選択肢から最適なものを選ぶのは簡単ではありません。本記事では、実践的な選び方のポイントを解説します。

## 1. 導入目的を明確にする

まず、なぜEdTechツールを導入するのか、その目的を明確にすることが重要です。

- **学習管理の効率化**: 授業準備や進捗管理を効率化したい
- **保護者とのコミュニケーション改善**: 連絡事項の伝達をスムーズにしたい
- **データ分析による教育改善**: 学習データを活用して指導を改善したい
- **業務の自動化**: 採点や事務作業を自動化したい

目的が明確になれば、必要な機能も自然と見えてきます。

## 2. 予算とコストを検討する

EdTechツールには、初期費用や月額費用がかかります。予算を事前に決めておくことで、選択肢を絞り込めます。

### コストの内訳

- **初期導入費用**: セットアップや研修にかかる費用
- **月額・年額の利用料**: 継続的な利用料金
- **追加機能のオプション費用**: 必要に応じて追加する機能の費用
- **サポート費用**: 専任サポートや優先サポートの費用
- **研修・トレーニング費用**: 教員向けの研修費用

## 3. 機能と使いやすさを比較する

同じカテゴリのツールでも、機能や使いやすさは大きく異なります。

### チェックポイント

- ✅ 必要な機能が揃っているか
- ✅ 直感的に使えるUIか
- ✅ モバイル対応しているか
- ✅ 既存システムとの連携は可能か
- ✅ 日本語対応は十分か

## 4. サポート体制を確認する

導入後のサポート体制も重要なポイントです。

- **問い合わせ対応の方法**: メール、電話、チャットなど
- **サポートの対応時間**: 営業時間内か、24時間対応か
- **マニュアルやドキュメントの充実度**: わかりやすい資料があるか
- **コミュニティやフォーラムの有無**: ユーザー同士で情報交換できるか

## 5. 無料トライアルを活用する

多くのEdTechツールは無料トライアルを提供しています。実際に使ってみることで、使いやすさや機能を確認できます。

### トライアル時の確認ポイント

1. 実際の業務フローで使ってみる
2. 複数の教員で試してみる
3. サポートの対応速度を確認する
4. データのエクスポート方法を確認する

## まとめ

EdTechツール選びは、目的の明確化から始まり、予算・機能・サポート体制を総合的に判断することが重要です。無料トライアルを積極的に活用し、実際の使用感を確認してから導入を決めることをおすすめします。

エデュマッチでは、500以上のEdTechサービスを比較・検討できます。ぜひご活用ください。
    `,
    image: "https://placehold.co/800x450/fef3c7/ca8a04?text=EdTech+Guide+2024",
    category: "教育ICT",
    date: "2024-01-15",
    readTime: "10分",
    tags: ["EdTech", "選び方", "導入", "ガイド"],
    author: "エデュマッチ編集部",
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/articles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            記事一覧に戻る
          </Link>
        </Button>
      </div>

      <article className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{article.category}</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(article.date).toLocaleDateString("ja-JP")}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {article.readTime}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {article.title}
          </h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {article.author}
            </div>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              共有
            </Button>
          </div>
        </div>

        {/* メイン画像 */}
        <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-contain"
            unoptimized
          />
        </div>

        {/* タグ */}
        <div className="flex flex-wrap gap-2 mb-8">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>

        {/* 本文 */}
        <div className="prose prose-slate max-w-none mb-8">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {article.content}
          </div>
        </div>

        {/* デモページの説明 */}
        <Card className="mt-12 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-2">デモページについて</h2>
            <p className="text-muted-foreground">
              このページは記事詳細ページのデモです。実際の記事ページと同じレイアウトと機能を持っています。
            </p>
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
