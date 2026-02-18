/** 記事・サービスの固定カテゴリ（22個） */
/** Post.category / Service.category で使用。タグ（Post.tags / Service.tags）とは別管理 */
export const ARTICLE_CATEGORIES = [
  "2023年",
  "2025年度",
  "2026年",
  "AI",
  "ICT",
  "オンライン",
  "セミナー",
  "プログラミング",
  "中学",
  "保護者",
  "受験",
  "地域",
  "塾",
  "大学",
  "学習",
  "小学校",
  "教員",
  "教材",
  "教育",
  "英語",
  "補助金",
  "高校"
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** カテゴリ文字列の検証 */
export function isValidArticleCategory(value: string): value is ArticleCategory {
  return ARTICLE_CATEGORIES.includes(value as ArticleCategory);
}

/** TSVパース用 */
export function parseArticleCategoryFromTsv(value: string): ArticleCategory | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidArticleCategory(trimmed) ? trimmed : null;
}
