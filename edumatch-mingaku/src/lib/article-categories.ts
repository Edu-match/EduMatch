/** 記事・サービスの固定カテゴリ */
/** Post.category / Service.category で使用。タグ（Post.tags / Service.tags）とは別管理 */
export const ARTICLE_CATEGORIES = [
  "AI",
  "ICT",
  "セミナー",
  "塾",
  "受験",
  "教育",
  "教材",
  "英語",
  "プログラミング",
  "保護者",
  "高校",
  "中学",
  "大学",
  "小学校",
  "教員",
  "地域",
  "学習",
  "オンライン",
  "補助金",
  "お役立ち情報",
  "事務局からのお知らせ",
  "未分類",
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
