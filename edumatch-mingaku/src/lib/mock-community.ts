export type ForumAnswer = {
  id: string;
  authorName: string;
  postedAt: string;
  body: string;
  helpfulCount: number;
  replies?: ForumAnswer[];
};

export type ForumThread = {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  authorName: string;
  postedAt: string;
  answerCount: number;
  bestAnswerId?: string;
  answers: ForumAnswer[];
};

/** 記事コメント用（フォーラムとは別） */
export type CommunityComment = {
  id: string;
  authorName: string;
  postedAt: string;
  body: string;
  helpfulCount: number;
  replies?: CommunityComment[];
};

export const FORUM_CATEGORIES = [
  "すべて",
  "授業づくり",
  "不登校",
  "ICT",
  "入試・進路",
  "学級経営",
  "その他",
] as const;

export const FORUM_SORT_OPTIONS = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "回答多い順" },
  { value: "unsolved", label: "未解決のみ" },
] as const;
