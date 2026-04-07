export type CommunityComment = {
  id: string;
  authorName: string;
  postedAt: string;
  body: string;
  helpfulCount: number;
  replies?: CommunityComment[];
};

export type ForumThread = {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  authorName: string;
  postedAt: string;
  commentCount: number;
  comments: CommunityComment[];
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
  { value: "popular", label: "コメント多い順" },
] as const;
