"use client";

import { AddToFavoritesButton } from "@/components/favorites/add-to-favorites-button";

type Props = {
  articleId: string;
  title: string;
  thumbnailUrl: string | null;
  category: string;
  className?: string;
};

export function ArticleDetailActions({
  articleId,
  title,
  thumbnailUrl,
  category,
  className,
}: Props) {
  return (
    <AddToFavoritesButton
      item={{
        id: articleId,
        title,
        thumbnail: thumbnailUrl ?? undefined,
        category,
        type: "article",
      }}
      variant="button"
      size="lg"
      className={className}
    />
  );
}
