"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowRight, Sparkles } from "lucide-react";
import { useFavorites } from "@/components/favorites/favorites-context";
import { analyzeFavoriteCategories } from "@/lib/recommendations";

type RecommendedItem = {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string;
  type: "service" | "article";
};

type RecommendationsSectionProps = {
  services: Array<{ id: string; title: string; thumbnail_url: string | null; category: string }>;
  articles: Array<{ id: string; title: string; thumbnail_url: string | null; category: string }>;
};

export function RecommendationsSection({ services, articles }: RecommendationsSectionProps) {
  const { favorites } = useFavorites();
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);

  useEffect(() => {
    if (favorites.length === 0) {
      setRecommendations([]);
      return;
    }

    // お気に入りのカテゴリーを分析
    const favoriteCategories = analyzeFavoriteCategories(favorites);

    if (favoriteCategories.length === 0) {
      setRecommendations([]);
      return;
    }

    // お気に入りに含まれていないアイテムで、カテゴリーが一致するものを抽出
    const favoriteIds = new Set(favorites.map((f) => f.id));

    const recommendedServices = services
      .filter(
        (service) =>
          !favoriteIds.has(service.id) &&
          favoriteCategories.includes(service.category)
      )
      .slice(0, 3)
      .map((service) => ({
        id: service.id,
        title: service.title,
        thumbnail: service.thumbnail_url,
        category: service.category,
        type: "service" as const,
      }));

    const recommendedArticles = articles
      .filter(
        (article) =>
          !favoriteIds.has(article.id) &&
          favoriteCategories.includes(article.category)
      )
      .slice(0, 3)
      .map((article) => ({
        id: article.id,
        title: article.title,
        thumbnail: article.thumbnail_url,
        category: article.category,
        type: "article" as const,
      }));

    // サービスと記事を混ぜて最大6件
    const allRecommendations = [...recommendedServices, ...recommendedArticles]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    setRecommendations(allRecommendations);
  }, [favorites, services, articles]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/10 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          あなたへのおすすめ
          <Badge variant="secondary" className="ml-2">
            お気に入りから
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.type === "service" ? `/services/${item.id}` : `/articles/${item.id}`}
              className="group block border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-40 bg-muted">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Star className="h-12 w-12 text-primary/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                    おすすめ
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <Badge variant="outline" className="mb-2 text-xs">
                  {item.category}
                </Badge>
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <span>{item.type === "service" ? "サービス" : "記事"}</span>
                  <ArrowRight className="h-3 w-3 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground mb-3">
            お気に入りが増えると、より精度の高いおすすめが表示されます
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/services">
                サービスを探す
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/articles">
                記事を読む
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
