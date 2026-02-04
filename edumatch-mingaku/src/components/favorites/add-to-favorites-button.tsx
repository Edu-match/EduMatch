"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "./favorites-context";
import type { FavoriteItem } from "@/lib/favorites";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  item: {
    id: string;
    title: string;
    thumbnail?: string;
    category?: string;
    type: "article" | "service";
  };
  variant?: "icon" | "button";
  size?: "sm" | "lg";
  className?: string;
};

export function AddToFavoritesButton({
  item,
  variant = "button",
  size,
  className,
}: Props) {
  const { hasFavorite, toggleFavorite } = useFavorites();
  const isFavorite = hasFavorite(item.id, item.type);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 認証チェック
    if (isAuthenticated === null) {
      toast.error("読み込み中です。もう一度お試しください。");
      return;
    }

    if (!isAuthenticated) {
      toast.error("この機能を使うにはログインが必要です");
      setTimeout(() => {
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect_to=${encodeURIComponent(currentPath)}&message=${encodeURIComponent("お気に入り機能を利用するにはログインが必要です")}`;
      }, 1000);
      return;
    }

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
