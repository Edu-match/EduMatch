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
  "探究・キャリア教育/総合型選抜対策",
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

export const SERVICE_CATEGORY_MAX_SELECTION = 3;
export const SERVICE_CATEGORY_OTHER_VALUE = "その他";
export const SERVICE_CATEGORY_OTHER_PREFIX = "その他:";
export const SERVICE_CATEGORY_OTHER_MAX_LENGTH = 10;

/** 後方互換 */
export const SERVICE_CATEGORIES_MAIN = SERVICE_CATEGORIES;
export const SERVICE_CATEGORIES_OTHER: { value: string; label: string }[] = [];
export const SERVICE_CATEGORY_VALUES = [...SERVICE_CATEGORY_LIST];

/** 記事カテゴリ value/label 配列 */
export const SHARED_CATEGORIES = ARTICLE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

export function parseServiceCategorySelection(rawCategory: string): {
  selectedCategories: string[];
  otherText: string;
} {
  const tokens = rawCategory
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  const selectedSet = new Set<string>();
  let otherText = "";

  for (const token of tokens) {
    if (token.startsWith(SERVICE_CATEGORY_OTHER_PREFIX)) {
      selectedSet.add(SERVICE_CATEGORY_OTHER_VALUE);
      otherText = token.slice(SERVICE_CATEGORY_OTHER_PREFIX.length).trim();
      continue;
    }

    if (token === SERVICE_CATEGORY_OTHER_VALUE) {
      selectedSet.add(SERVICE_CATEGORY_OTHER_VALUE);
      continue;
    }

    if (SERVICE_CATEGORY_VALUES.includes(token as ServiceCategory)) {
      selectedSet.add(token);
    }
  }

  return {
    selectedCategories: [...selectedSet].slice(0, SERVICE_CATEGORY_MAX_SELECTION),
    otherText: otherText.slice(0, SERVICE_CATEGORY_OTHER_MAX_LENGTH),
  };
}

export function serializeServiceCategorySelection(
  selectedCategories: string[],
  otherText: string
): string {
  const unique = [...new Set(selectedCategories)]
    .filter((value) => value === SERVICE_CATEGORY_OTHER_VALUE || SERVICE_CATEGORY_VALUES.includes(value as ServiceCategory))
    .slice(0, SERVICE_CATEGORY_MAX_SELECTION);

  const normalizedOther = otherText.trim().slice(0, SERVICE_CATEGORY_OTHER_MAX_LENGTH);

  return unique
    .map((value) => {
      if (value !== SERVICE_CATEGORY_OTHER_VALUE) return value;
      return normalizedOther
        ? `${SERVICE_CATEGORY_OTHER_PREFIX}${normalizedOther}`
        : SERVICE_CATEGORY_OTHER_VALUE;
    })
    .join(",");
}
