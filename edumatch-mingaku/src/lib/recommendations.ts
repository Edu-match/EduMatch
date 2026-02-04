import { FavoriteItem } from "./favorites";

/**
 * お気に入りのカテゴリーを分析して、頻度の高いカテゴリーを取得
 */
export function analyzeFavoriteCategories(favorites: FavoriteItem[]): string[] {
  const categoryCount: Record<string, number> = {};

  // カテゴリーの出現回数をカウント
  favorites.forEach((item) => {
    if (item.category) {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    }
  });

  // 出現回数でソートして上位カテゴリーを取得
  const sortedCategories = Object.entries(categoryCount)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([category]) => category);

  return sortedCategories;
}

/**
 * お気に入りアイテムが特定のカテゴリーに関連しているか判定
 */
export function isRelatedCategory(
  targetCategory: string,
  favoriteCategories: string[]
): boolean {
  return favoriteCategories.includes(targetCategory);
}

/**
 * お気に入りに基づいたおすすめスコアを計算
 */
export function calculateRecommendationScore(
  itemCategory: string,
  favoriteCategories: string[]
): number {
  const index = favoriteCategories.indexOf(itemCategory);
  if (index === -1) return 0;

  // 上位カテゴリーほど高いスコア
  return favoriteCategories.length - index;
}
