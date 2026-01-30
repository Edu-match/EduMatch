"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites, type FavoriteItem } from "./favorites-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  item: {
    id: string;
    title: string;
    thumbnail?: string;
    category?: string;
    type: "article" | "service";
  };
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function AddToFavoritesButton({
  item,
  variant = "button",
  size = "md",
  className,
}: Props) {
  const { hasFavorite, toggleFavorite } = useFavorites();
  const isFavorite = hasFavorite(item.id, item.type);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const favoriteItem: FavoriteItem = {
      id: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      category: item.category,
      type: item.type,
    };

    const added = toggleFavorite(favoriteItem);

    if (added) {
      toast.success("お気に入りに追加しました");
    } else {
      toast.info("お気に入りから削除しました");
    }
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn(
          "rounded-full bg-white/95 hover:bg-white shadow-lg border-0",
          isFavorite && "bg-red-50 hover:bg-red-100",
          className
        )}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-colors",
            isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isFavorite ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      className={cn(className)}
    >
      <Heart
        className={cn(
          "h-4 w-4 mr-2 transition-colors",
          isFavorite ? "fill-current" : ""
        )}
      />
      {isFavorite ? "お気に入り済み" : "お気に入りに追加"}
    </Button>
  );
}
