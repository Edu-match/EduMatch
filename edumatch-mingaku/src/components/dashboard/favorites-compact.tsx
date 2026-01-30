"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/components/favorites/favorites-context";
import { Heart, ArrowRight, Newspaper, Building2 } from "lucide-react";
import { AddToFavoritesButton } from "@/components/favorites/add-to-favorites-button";
import { Badge } from "@/components/ui/badge";

export function FavoritesCompact() {
  const { favorites } = useFavorites();

  const articles = favorites.filter((f) => f.type === "article").slice(0, 3);
  const services = favorites.filter((f) => f.type === "service").slice(0, 3);
  const totalCount = favorites.length;

  if (totalCount === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground py-4">
          気になる記事やサービスをお気に入りに追加すると、ここに表示されます。
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/articles">
            記事を探す
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 記事のお気に入り */}
      {articles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">記事 ({articles.length})</span>
          </div>
          <div className="space-y-2">
            {articles.map((article) => (
              <div
                key={`article-${article.id}`}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Link
                  href={`/articles/${article.id}`}
                  className="flex flex-1 gap-2 min-w-0"
                >
                  <div className="relative w-12 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
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
                        <Newspaper className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs line-clamp-1">{article.title}</p>
                    {article.category && (
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {article.category}
                      </Badge>
                    )}
                  </div>
                </Link>
                <AddToFavoritesButton
                  item={{
                    id: article.id,
                    title: article.title,
                    thumbnail: article.thumbnail,
                    category: article.category,
                    type: "article",
                  }}
                  variant="icon"
                  className="flex-shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* サービスのお気に入り */}
      {services.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">サービス ({services.length})</span>
          </div>
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={`service-${service.id}`}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Link
                  href={`/services/${service.id}`}
                  className="flex flex-1 gap-2 min-w-0"
                >
                  <div className="relative w-12 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
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
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs line-clamp-1">{service.title}</p>
                    {service.category && (
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {service.category}
                      </Badge>
                    )}
                  </div>
                </Link>
                <AddToFavoritesButton
                  item={{
                    id: service.id,
                    title: service.title,
                    thumbnail: service.thumbnail,
                    category: service.category,
                    type: "service",
                  }}
                  variant="icon"
                  className="flex-shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCount > 6 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            他 {totalCount - 6} 件のお気に入りがあります
          </p>
        </div>
      )}
    </div>
  );
}
