import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Calendar, Tag, UserPlus, LogIn } from "lucide-react";

export default function ArticleGatePage() {
  const article = {
    title: "EdTechツール選びの完全ガイド：2024年最新版",
    excerpt:
      "数多くのEdTechツールから最適なものを選ぶためのポイントを解説。予算、機能、導入のしやすさなど、実践的な選び方を紹介します。",
    image: "https://placehold.co/800x400/fef3c7/ca8a04?text=Premium+Article",
    category: "教育ICT",
    date: "2024-01-15",
    tags: ["EdTech", "選び方", "導入"],
    author: "エデュマッチ編集部",
    previewContent: `
# EdTechツール選びの完全ガイド

教育現場でEdTechツールを導入する際、数多くの選択肢から最適なものを選ぶのは簡単ではありません。本記事では、実践的な選び方のポイントを解説します。

## 1. 導入目的を明確にする

まず、なぜEdTechツールを導入するのか、その目的を明確にすることが重要です。

- 学習管理の効率化
- 保護者とのコミュニケーション改善
- データ分析による教育改善
- 業務の自動化

目的が明確になれば、必要な機能も自然と見えてきます...
    `,
  };

  return (
    <div className="container py-8">
      <article className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{article.category}</Badge>
            <Badge className="bg-amber-500 hover:bg-amber-600">会員限定</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(article.date).toLocaleDateString("ja-JP")}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {article.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            {article.excerpt}
          </p>
          <p className="text-sm text-muted-foreground">
            執筆者: {article.author}
          </p>
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

        {/* プレビューコンテンツ */}
        <div className="prose prose-slate max-w-none mb-8">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {article.previewContent}
          </div>
        </div>

        {/* ゲートセクション */}
        <div className="relative">
          {/* グラデーションオーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background -top-32 pointer-events-none" />

          {/* 会員登録促進カード */}
          <Card className="relative border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-background">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Lock className="h-8 w-8 text-primary" />
              </div>

              <h2 className="text-2xl font-bold mb-4">
                続きを読むには会員登録が必要です
              </h2>

              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                エデュマッチに無料会員登録すると、この記事の全文や、会員限定の教育コンテンツ、
                お気に入り機能などをご利用いただけます。
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/auth/login">
                    <UserPlus className="h-5 w-5" />
                    無料会員登録
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/auth/login">
                    <LogIn className="h-5 w-5" />
                    ログイン
                  </Link>
                </Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">会員登録のメリット</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">全記事が読み放題</p>
                    <p className="text-muted-foreground">
                      会員限定コンテンツを含む全ての記事にアクセス
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">お気に入り機能</p>
                    <p className="text-muted-foreground">
                      気になる記事やサービスを保存して管理
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">パーソナライズ</p>
                    <p className="text-muted-foreground">
                      あなたに合ったおすすめコンテンツを表示
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </article>
    </div>
  );
}
