/**
 * 記事カテゴリ
 */
export {
  ARTICLE_CATEGORIES,
  type ArticleCategory,
  isValidArticleCategory,
  parseArticleCategoryFromTsv,
} from "./article-categories";

import { ARTICLE_CATEGORIES } from "./article-categories";

/** サービス専用カテゴリ */
export const SERVICE_CATEGORY_LIST = [
  "AI活用",
  "保護者連絡",
  "生徒管理",
  "生徒集客",
  "英会話",
  "映像授業",
  "問題演習",
  "学習管理システム(LMS)",
  "質問対応",
  "プログラミング",
  "探求・キャリア教育/総合型選抜対策",
  "オンライン授業支援",
  "家庭学習支援",
  "知育/能力開発/幼児教育",
  "講師採用/育成/研修",
  "デバイス・ハードウェア・ICT環境構築",
  "コンサル/フランチャイズ/M&A",
  "助成金・補助金支援",
  "その他管理/代行",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORY_LIST)[number];

/** サービスカテゴリの value/label 配列（フォーム・フィルター用） */
export const SERVICE_CATEGORIES = SERVICE_CATEGORY_LIST.map((c) => ({
  value: c,
  label: c,
}));

/** 後方互換 */
export const SERVICE_CATEGORIES_MAIN = SERVICE_CATEGORIES;
export const SERVICE_CATEGORIES_OTHER: { value: string; label: string }[] = [];
export const SERVICE_CATEGORY_VALUES = [...SERVICE_CATEGORY_LIST];

/** 記事カテゴリ value/label 配列 */
export const SHARED_CATEGORIES = ARTICLE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));
