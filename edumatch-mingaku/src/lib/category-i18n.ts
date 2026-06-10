import type { Locale } from "@/i18n/config";

/**
 * 固定語彙であるカテゴリの英語ラベル。
 * AI 翻訳を毎回呼ぶ必要がないよう、静的な対訳表で管理する。
 * （サーバー・クライアント双方から利用可能）
 */
const SERVICE_CATEGORY_EN: Record<string, string> = {
  "AI活用": "AI Utilization",
  "保護者連絡": "Parent Communication",
  "生徒管理": "Student Management",
  "生徒集客": "Student Acquisition",
  "英会話": "English Conversation",
  "映像授業": "Video Lessons",
  "問題演習": "Practice Problems",
  "学習管理システム(LMS)": "Learning Management System (LMS)",
  "質問対応": "Q&A Support",
  "プログラミング": "Programming",
  "探究・キャリア教育/総合型選抜対策": "Inquiry & Career Education / Admissions Prep",
  "オンライン授業支援": "Online Class Support",
  "家庭学習支援": "Home Learning Support",
  "知育/能力開発/幼児教育": "Cognitive Development / Early Childhood Education",
  "講師採用/育成/研修": "Instructor Recruiting / Training",
  "デバイス・ハードウェア・ICT環境構築": "Devices / Hardware / ICT Setup",
  "コンサル/フランチャイズ/M&A": "Consulting / Franchise / M&A",
  "助成金・補助金支援": "Grants & Subsidy Support",
  "その他管理/代行": "Other Management / Outsourcing",
  "その他": "Other",
};

/** サービスカテゴリ名を表示言語にローカライズする（未知の値はそのまま返す） */
export function localizeServiceCategory(category: string, locale: Locale): string {
  if (locale !== "en" || !category) return category;
  return SERVICE_CATEGORY_EN[category] ?? category;
}

const ARTICLE_CATEGORY_EN: Record<string, string> = {
  "AI": "AI",
  "ICT": "ICT",
  "セミナー": "Seminars",
  "塾": "Cram Schools",
  "受験": "Exams",
  "教育": "Education",
  "教材": "Materials",
  "英語": "English",
  "プログラミング": "Programming",
  "保護者": "Parents",
  "高校": "High School",
  "中学": "Junior High",
  "大学": "University",
  "小学校": "Elementary",
  "教員": "Teachers",
  "地域": "Community",
  "学習": "Learning",
  "オンライン": "Online",
  "補助金": "Subsidies",
  "お役立ち情報": "Useful Tips",
  "事務局からのお知らせ": "Announcements",
  "未分類": "Uncategorized",
};

/** 記事カテゴリ名を表示言語にローカライズする（未知の値はそのまま返す） */
export function localizeArticleCategory(category: string, locale: Locale): string {
  if (locale !== "en" || !category) return category;
  return ARTICLE_CATEGORY_EN[category] ?? category;
}
