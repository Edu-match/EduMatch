import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  BookOpen,
  Wrench,
  Users,
} from "lucide-react";

const recommendedServices = [
  {
    id: 1,
    name: "ClassTech Pro",
    description: "あなたの関心「学習管理」に最適なツールです",
    image: "https://placehold.co/300x200/fef3c7/ca8a04?text=ClassTech",
    category: "学習管理",
    rating: 4.8,
    matchScore: 95,
  },
  {
    id: 2,
    name: "SmartAssess",
    description: "評価・分析に興味があるあなたにおすすめ",
    image: "https://placehold.co/300x200/fecaca/dc2626?text=SmartAssess",
    category: "評価・分析",
    rating: 4.9,
    matchScore: 92,
  },
  {
    id: 3,
    name: "EduCollabo",
    description: "保護者連携を重視するあなたに最適",
    image: "https://placehold.co/300x200/fed7aa/ea580c?text=EduCollabo",
    category: "コミュニケーション",
    rating: 4.6,
    matchScore: 88,
  },
];

const recommendedArticles = [
  {
    id: 1,
    title: "EdTechツール選びの完全ガイド",
    excerpt: "あなたの閲覧履歴から、このガイドが参考になると思います",
    image: "https://placehold.co/400x250/e2e8f0/334155?text=Article",
    category: "教育ICT",
    readTime: "10分",
  },
  {
    id: 2,
    title: "学校DX推進のためのステップ",
    excerpt: "DXに興味があるあなたにおすすめの記事です",
    image: "https://placehold.co/400x250/f1f5f9/0f172a?text=Article",
    category: "導入事例",
    readTime: "8分",
  },
  {
    id: 3,
    title: "データドリブンな教育改善の実践",
    excerpt: "評価・分析カテゴリに関心が高いあなたへ",
    image: "https://placehold.co/400x250/fef3c7/ca8a04?text=Article",
    category: "教育ICT",
    readTime: "12分",
  },
];

const trendingTopics = [
  { name: "GIGAスクール", count: 156 },
  { name: "AI活用", count: 134 },
  { name: "プログラミング教育", count: 98 },
  { name: "オンライン授業", count: 87 },
  { name: "学習分析", count: 76 },
];

export default function RecommendPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">あなたへのおすすめ</h1>
        </div>
        <p className="text-muted-foreground">
          AI分析によるパーソナライズされたおすすめコンテンツ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-8">
          {/* おすすめサービス */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                おすすめのサービス
              </h2>
              <Link
                href="/services"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                すべて見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedServices.map((service) => (
                <Link key={service.id} href={`/services/${service.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <div className="relative h-32 w-full">
                      <Image
                        src={service.image}
                        alt={service.name}
                        fill
                        className="object-cover rounded-t-lg"
                        unoptimized
                      />
                      <Badge className="absolute top-2 right-2 bg-primary">
                        {service.matchScore}% マッチ
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {service.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {service.rating}
                        </div>
                      </div>
                      <h3 className="font-bold mb-1">{service.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* おすすめ記事 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                おすすめの記事
              </h2>
              <Link
                href="/articles"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                すべて見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {recommendedArticles.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative h-24 w-36 flex-shrink-0">
                          <Image
                            src={article.image}
                            alt={article.title}
                            fill
                            className="object-cover rounded-lg"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {article.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <h3 className="font-bold mb-1">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.excerpt}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* 閲覧履歴に基づくおすすめ */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  あなたと似た教育関係者が注目
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-2">同じ学校種の方に人気</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between">
                        <span>ClassTech Pro</span>
                        <Badge variant="secondary">87%が導入検討中</Badge>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>SmartAssess</span>
                        <Badge variant="secondary">72%が導入検討中</Badge>
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-2">同じ課題を持つ方に人気</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between">
                        <span>EduCollabo</span>
                        <Badge variant="secondary">保護者連携に効果的</Badge>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>TeamEdu</span>
                        <Badge variant="secondary">協働学習に最適</Badge>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* あなたのプロフィール */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">あなたの関心</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge>学習管理</Badge>
                <Badge>評価・分析</Badge>
                <Badge variant="secondary">コミュニケーション</Badge>
                <Badge variant="outline">協働学習</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                閲覧履歴から分析した、あなたの関心の高いカテゴリです。
              </p>
              <Button variant="outline" size="sm" className="w-full">
                関心を編集する
              </Button>
            </CardContent>
          </Card>

          {/* トレンドトピック */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                トレンドトピック
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <li key={topic.name}>
                    <Link
                      href={`/articles?q=${topic.name}`}
                      className="flex items-center justify-between hover:text-primary transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                          {index + 1}
                        </span>
                        {topic.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {topic.count}件
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* おすすめの改善 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                おすすめ精度を上げる
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                プロフィールを充実させると、より精度の高いおすすめを表示できます。
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href="/profile/register">プロフィールを編集</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
