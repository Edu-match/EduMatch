export type CommunityRole =
  | "teacher"
  | "student"
  | "expert"
  | "guardian"
  | "general"
  | "anonymous";

export type CommunityComment = {
  id: string;
  authorName: string;
  authorRole: CommunityRole;
  postedAt: string;
  body: string;
  helpfulCount: number;
  isBestAnswer?: boolean;
  replies?: CommunityComment[];
};

export type ForumThread = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: CommunityRole;
  postedAt: string;
  replyCount: number;
  viewCount: number;
  bestAnswerId?: string;
  comments: CommunityComment[];
};

export const COMMUNITY_ROLE_LABELS: Record<CommunityRole, string> = {
  teacher: "教員",
  student: "学生",
  expert: "専門家",
  guardian: "保護者",
  general: "一般",
  anonymous: "匿名",
};

export const FORUM_CATEGORIES = [
  "すべて",
  "授業づくり",
  "不登校",
  "ICT",
  "入試・進路",
  "学級経営",
] as const;

export const FORUM_SORT_OPTIONS = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "人気順" },
] as const;

export const mockForumThreads: ForumThread[] = [
  {
    id: "forum-1",
    title: "中1数学で理解差が大きいクラス、導入の工夫はありますか？",
    summary:
      "一斉授業だと早い生徒とつまずく生徒の差が開きやすく、導入5分の設計を見直したいです。",
    body:
      "公立中学校で中1数学を担当しています。正負の数の単元で、既習内容の差が大きく、導入時点で集中が切れてしまう生徒が増えています。板書中心から少し変えたいのですが、短時間で参加しやすい導入の工夫や、ICTを使いすぎずにできる方法があれば知りたいです。",
    category: "授業づくり",
    tags: ["数学", "中学校", "導入", "協働学習"],
    authorName: "都内中学校教員",
    authorRole: "teacher",
    postedAt: "2026-04-05T18:30:00+09:00",
    replyCount: 4,
    viewCount: 382,
    bestAnswerId: "forum-1-comment-1",
    comments: [
      {
        id: "forum-1-comment-1",
        authorName: "授業研究アドバイザー",
        authorRole: "expert",
        postedAt: "2026-04-05T20:10:00+09:00",
        body:
          "最初の3分を『全員が答えられる確認問題』に固定すると参加率が上がりやすいです。例えば前時の内容を1問だけ個人で解き、その後にペアで答え合わせを入れると、つまずいている生徒も発言前に整理できます。導入のゴールを一言で掲示しておくのもおすすめです。",
        helpfulCount: 28,
        isBestAnswer: true,
        replies: [
          {
            id: "forum-1-comment-1-reply-1",
            authorName: "投稿者",
            authorRole: "teacher",
            postedAt: "2026-04-05T21:02:00+09:00",
            body:
              "ありがとうございます。『全員が答えられる1問』は取り入れやすそうです。ペア確認まで含めて次時で試してみます。",
            helpfulCount: 6,
          },
        ],
      },
      {
        id: "forum-1-comment-2",
        authorName: "教育学部3年",
        authorRole: "student",
        postedAt: "2026-04-06T08:40:00+09:00",
        body:
          "教育実習で見た授業では、導入だけミニホワイトボードを使っていました。全員の反応が見えるので、先生がその場で支援対象を判断しやすそうでした。",
        helpfulCount: 15,
      },
      {
        id: "forum-1-comment-3",
        authorName: "高校教員",
        authorRole: "teacher",
        postedAt: "2026-04-06T12:15:00+09:00",
        body:
          "自校では『できた人が教える』よりも『考え方を比べる』に寄せた方が落ち着きました。正解の早さより、どう考えたかを短く共有すると参加しやすい印象です。",
        helpfulCount: 11,
      },
    ],
  },
  {
    id: "forum-2",
    title: "不登校傾向の子どもと家庭の連携、最初の一歩をどう作るべき？",
    summary:
      "学校からの連絡が負担にならない形で、保護者と信頼関係を作る方法を相談したいです。",
    body:
      "小学校高学年の子どもが朝に強い不安を示しており、欠席が続いています。担任として家庭と連携したいのですが、連絡が多いとかえって負担になるのではと悩んでいます。最初にどのような声かけや提案をすると前向きに話し合いが始めやすいでしょうか。",
    category: "不登校",
    tags: ["保護者連携", "小学校", "心理的安全性"],
    authorName: "小学校教員A",
    authorRole: "teacher",
    postedAt: "2026-04-04T09:00:00+09:00",
    replyCount: 3,
    viewCount: 521,
    comments: [
      {
        id: "forum-2-comment-1",
        authorName: "スクールカウンセラー",
        authorRole: "expert",
        postedAt: "2026-04-04T10:30:00+09:00",
        body:
          "まずは登校を促すことよりも、『今いちばん困っていることを一緒に整理したい』という姿勢を伝えると受け止められやすいです。電話よりも、保護者が返しやすい短い文章連絡から始めるケースも多いです。",
        helpfulCount: 33,
      },
      {
        id: "forum-2-comment-2",
        authorName: "保護者",
        authorRole: "guardian",
        postedAt: "2026-04-04T22:05:00+09:00",
        body:
          "当事者としては、連絡頻度より『責められていない』と感じられる内容かどうかが大きかったです。選択肢を複数示してもらえると返事しやすいです。",
        helpfulCount: 21,
      },
    ],
  },
  {
    id: "forum-3",
    title: "高校での生成AI活用、レポート課題はどこまで許容すべきですか？",
    summary:
      "禁止だけでは運用できず、使い方の線引きや指導の実例が知りたいです。",
    body:
      "高校で探究活動を担当しています。生成AIを使って情報整理をする生徒が増えていますが、丸写しや根拠の弱い記述も見られます。全面禁止ではなく適切に使わせたい一方で、評価基準の示し方に迷っています。実際に運用している方がいれば教えてください。",
    category: "ICT",
    tags: ["生成AI", "高校", "探究", "評価"],
    authorName: "探究担当",
    authorRole: "teacher",
    postedAt: "2026-04-02T15:20:00+09:00",
    replyCount: 5,
    viewCount: 768,
    comments: [
      {
        id: "forum-3-comment-1",
        authorName: "大学研究者",
        authorRole: "expert",
        postedAt: "2026-04-02T17:00:00+09:00",
        body:
          "提出物そのものより、生成過程の記録をセットにすると評価しやすくなります。『どの場面でAIを使い、どこを自分で検証したか』を書かせるだけでも、学習者の思考が見えます。",
        helpfulCount: 41,
        replies: [
          {
            id: "forum-3-comment-1-reply-1",
            authorName: "高校2年",
            authorRole: "student",
            postedAt: "2026-04-02T18:12:00+09:00",
            body:
              "生徒側としても、使ってはいけないより『使ったら記録する』の方が納得感があります。ルールが明確だと助かります。",
            helpfulCount: 12,
          },
        ],
      },
      {
        id: "forum-3-comment-2",
        authorName: "一般ユーザー",
        authorRole: "general",
        postedAt: "2026-04-03T09:45:00+09:00",
        body:
          "保護者向けにも学校の方針を共有してもらえると安心です。家庭での使い方の話題にもつながります。",
        helpfulCount: 9,
      },
    ],
  },
];

export function getForumThreadById(id: string) {
  return mockForumThreads.find((thread) => thread.id === id);
}

export function createMockArticleComments(articleId: string, articleTitle: string): CommunityComment[] {
  return [
    {
      id: `${articleId}-comment-1`,
      authorName: "現場の先生",
      authorRole: "teacher",
      postedAt: "2026-04-06T09:15:00+09:00",
      body: `この記事「${articleTitle}」の実践例は、保護者説明にも使いやすい整理でした。現場で運用するときの注意点も今後知りたいです。`,
      helpfulCount: 18,
      replies: [
        {
          id: `${articleId}-comment-1-reply-1`,
          authorName: "教育学専攻の学生",
          authorRole: "student",
          postedAt: "2026-04-06T11:00:00+09:00",
          body:
            "学生目線でも分かりやすかったです。実際の授業設計まで踏み込んだ続編があるとうれしいです。",
          helpfulCount: 6,
        },
      ],
    },
    {
      id: `${articleId}-comment-2`,
      authorName: "匿名ユーザー",
      authorRole: "anonymous",
      postedAt: "2026-04-07T07:50:00+09:00",
      body:
        "参考資料への導線がまとまっていて助かりました。校内共有用に要点だけ抜き出した版もあると便利そうです。",
      helpfulCount: 10,
    },
  ];
}
