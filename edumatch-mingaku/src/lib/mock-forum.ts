// ─── 型定義 ────────────────────────────────────────────────

export type AuthorRole = "教員" | "学生" | "専門家" | "企業" | "一般" | "匿名";

export type ForumPost = {
  id: string;
  roomId: string;
  authorName: string;
  authorRole: AuthorRole;
  body: string;
  likeCount: number;
  replyCount: number;
  postedAt: string;
  isPinned?: boolean;
  relatedArticleUrl?: string;
  replies?: ForumReply[];
};

export type ForumReply = {
  id: string;
  authorName: string;
  authorRole: AuthorRole;
  body: string;
  likeCount: number;
  postedAt: string;
};

export type ForumRoom = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  weeklyTopic: string;
  postCount: number;
  participantCount: number;
  lastPostedAt: string;
  /** AIディスカッション機能の有効フラグ */
  aiDiscussion?: boolean;
};

// ─── 部屋一覧（6部屋）──────────────────────────────────────
// generateStaticParams 用。実データはDBから取得する。

export const FORUM_ROOMS: ForumRoom[] = [
  {
    id: "ai-lesson",
    name: "AI×授業設計",
    description: "授業にAIを取り入れるとしたら、どこから始めますか？",
    emoji: "🤖",
    weeklyTopic: "授業にAIを取り入れるとしたら、どこから始めますか？",
    postCount: 0,
    participantCount: 0,
    lastPostedAt: new Date().toISOString(),
    aiDiscussion: true,
  },
  {
    id: "giga-school",
    name: "GIGAスクールのリアル",
    description: "端末が配られた。それで、現場は変わりましたか？",
    emoji: "💻",
    weeklyTopic: "端末が配られた。それで、現場は変わりましたか？",
    postCount: 0,
    participantCount: 0,
    lastPostedAt: new Date().toISOString(),
    aiDiscussion: false,
  },
  {
    id: "diverse-learning",
    name: "不登校と多様な学び",
    description: "学校以外の学びの場は、どこまで認められるべきか？",
    emoji: "🌈",
    weeklyTopic: "学校以外の学びの場は、どこまで認められるべきか？",
    postCount: 0,
    participantCount: 0,
    lastPostedAt: new Date().toISOString(),
    aiDiscussion: false,
  },
  {
    id: "teacher-work",
    name: "教員の働き方とテクノロジー",
    description: "AIは教員の仕事を楽にしますか？それとも増やしますか？",
    emoji: "🏫",
    weeklyTopic: "AIは教員の仕事を楽にしますか？それとも増やしますか？",
    postCount: 0,
    participantCount: 0,
    lastPostedAt: new Date().toISOString(),
    aiDiscussion: false,
  },
  {
    id: "education-gap",
    name: "教育格差とEdTech",
    description: "テクノロジーは教育格差を縮めますか？広げますか？",
    emoji: "📊",
    weeklyTopic: "テクノロジーは教育格差を縮めますか？広げますか？",
    postCount: 0,
    participantCount: 0,
    lastPostedAt: new Date().toISOString(),
    aiDiscussion: false,
  },
  {
    id: "ai-literacy",
    name: "子どもとAIリテラシー",
    description: "AIと付き合う力を、学校でどう育てればいいか？",
    emoji: "🧠",
    weeklyTopic: "AIと付き合う力を、学校でどう育てればいいか？",
    postCount: 0,
    participantCount: 0,
    lastPostedAt: new Date().toISOString(),
    aiDiscussion: true,
  },
];

export const FORUM_POSTS: ForumPost[] = [];

// ─── ヘルパー関数 ─────────────────────────────────────────

export function getRoomById(id: string): ForumRoom | undefined {
  return FORUM_ROOMS.find((r) => r.id === id);
}

export function getPostsByRoom(roomId: string): ForumPost[] {
  return FORUM_POSTS.filter((p) => p.roomId === roomId);
}

export function getPinnedPosts(roomId: string): ForumPost[] {
  return FORUM_POSTS.filter((p) => p.roomId === roomId && p.isPinned);
}
