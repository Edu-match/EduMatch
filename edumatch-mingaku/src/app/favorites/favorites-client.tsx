"use client";

import { useFavorites } from "@/components/favorites/favorites-context";
import { AddToFavoritesButton } from "@/components/favorites/add-to-favorites-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Newspaper, Building2, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { validateFavorites, type ValidatedFavoriteItem } from "@/app/_actions/favorites";

export function FavoritesClient() {
  const { favorites, removeFavorite } = useFavorites();
  const [validatedFavorites, setValidatedFavorites] = useState<ValidatedFavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function validate() {
      if (favorites.length === 0) {
        setIsLoading(false);
        return;
      }

      const articleIds = favorites.filter(f => f.type === "article").map(f => f.id);
      const serviceIds = favorites.filter(f => f.type === "service").map(f => f.id);

      const validated = await validateFavorites(articleIds, serviceIds);
      setValidatedFavorites(validated);

      // 削除されたアイテムをlocalStorageから削除
      const validIds = new Set(validated.map(v => v.id));
      favorites.forEach(fav => {
        if (!validIds.has(fav.id)) {
          removeFavorite(fav.id, fav.type);
        }
      });

      setIsLoading(false);
    }

    validate();
  }, [favorites.length]); // favorites自体を依存配列に入れると無限ループになるのでlengthのみ

  const articles = validatedFavorites.filter((f) => f.type === "article");
  const services = validatedFavorites.filter((f) => f.type === "service");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validatedFavorites.length === 0) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              いいねはまだありません
            </h3>
            <p className="text-muted-foreground mb-6">
              記事やサービス詳細ページからいいねすると、ここに一覧表示されます。
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button asChild>
                <Link href="/articles">記事を探す</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/services">サービスを探す</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* 記事のいいね */}
      {articles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">記事 ({articles.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article) => (
              <Card key={`article-${article.id}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/articles/${article.id}`} className="block">
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    {article.thumbnail ? (
                      <Image
                        src={article.thumbnail}
                        alt={article.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Newspaper className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2 mb-1">{article.title}</h3>
                      {article.category && (
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                      )}
                    </div>
                    <AddToFavoritesButton
                      item={{
                        id: article.id,
                        title: article.title,
                        thumbnail: article.thumbnail ?? undefined,
                        category: article.category ?? undefined,
                        type: "article",
                      }}
                      variant="icon"
                      className="flex-shrink-0"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                    <Link href={`/articles/${article.id}`}>
                      記事を読む
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* サービスのいいね */}
      {services.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">サービス ({services.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Card key={`service-${service.id}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/services/${service.id}`} className="block">
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    {service.thumbnail ? (
                      <Image
                        src={service.thumbnail}
                        alt={service.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2 mb-1">{service.title}</h3>
                      {service.category && (
                        <Badge variant="secondary" className="text-xs">
                          {service.category}
                        </Badge>
                      )}
                    </div>
                    <AddToFavoritesButton
                      item={{
                        id: service.id,
                        title: service.title,
                        thumbnail: service.thumbnail ?? undefined,
                        category: service.category ?? undefined,
                        type: "service",
                      }}
                      variant="icon"
                      className="flex-shrink-0"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                    <Link href={`/services/${service.id}`}>
                      詳細を見る
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
