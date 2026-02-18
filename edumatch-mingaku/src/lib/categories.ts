/**
 * 記事・サービス共通の固定カテゴリ（22個）
 * Post.category / Service.category で使用。タグ（Post.tags / Service.tags）とは別管理
 */
export {
  ARTICLE_CATEGORIES,
  type ArticleCategory,
  isValidArticleCategory,
  parseArticleCategoryFromTsv,
} from "./article-categories";

import { ARTICLE_CATEGORIES } from "./article-categories";

/** 共通カテゴリの value/label 配列（フォーム・フィルター用） */
export const SHARED_CATEGORIES = ARTICLE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

/** フォーム等で使う全カテゴリ（記事・サービス共通） */
export const SERVICE_CATEGORIES = SHARED_CATEGORIES;

/** 後方互換: サービスも共通カテゴリを使用するため同じリストを指す */
export const SERVICE_CATEGORIES_MAIN = SHARED_CATEGORIES;

/** 後方互換: 「その他」プルダウンは廃止（共通22個のみ。その中に「その他」は含めず重複解消） */
export const SERVICE_CATEGORIES_OTHER: { value: string; label: string }[] = [];

/** サービス用カテゴリ値の配列（検証用） */
export const SERVICE_CATEGORY_VALUES = [...ARTICLE_CATEGORIES];
