"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  hasInFavorites,
  toggleFavorites,
  type FavoriteItem,
} from "@/lib/favorites";

type FavoritesContextValue = {
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (itemId: string, type: "article" | "service") => void;
  hasFavorite: (itemId: string, type: "article" | "service") => boolean;
  toggleFavorite: (item: FavoriteItem) => boolean;
  favoritesCount: number;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    // 初期読み込み
    setFavorites(getFavorites());

    // ストレージ変更イベントをリッスン
    const handleChange = () => {
      setFavorites(getFavorites());
    };

    window.addEventListener("edumatch-favorites-change", handleChange);
    return () => {
      window.removeEventListener("edumatch-favorites-change", handleChange);
    };
  }, []);

  const addFavorite = (item: FavoriteItem) => {
    addToFavorites(item);
    setFavorites(getFavorites());
  };

  const removeFavorite = (itemId: string, type: "article" | "service") => {
    removeFromFavorites(itemId, type);
    setFavorites(getFavorites());
  };

  const hasFavorite = (itemId: string, type: "article" | "service") => {
    return hasInFavorites(itemId, type);
  };

  const toggleFavorite = (item: FavoriteItem) => {
    const result = toggleFavorites(item);
    setFavorites(getFavorites());
    return result;
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        hasFavorite,
        toggleFavorite,
        favoritesCount: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
