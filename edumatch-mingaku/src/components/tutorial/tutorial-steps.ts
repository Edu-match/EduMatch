export const TUTORIAL_DONE_STORAGE_KEY = "edu_match_tutorial_done";
export const TUTORIAL_PROGRESS_STORAGE_KEY = "edu_match_tutorial_progress";

export type TutorialPageId = "home" | "articles" | "forum" | "ai-kentei" | "dashboard";

export const TUTORIAL_PAGE_LABELS: Record<TutorialPageId, string> = {
  home: "ホーム",
  articles: "記事一覧",
  forum: "井戸端会議",
  "ai-kentei": "AI検定",
  dashboard: "マイページ",
};

export type TutorialStepDefinition = {
  selector: string;
  title: string;
  description: string;
  nextLabel?: string;
};

export type TutorialPageDefinition = {
  id: TutorialPageId;
  pathname: string;
  steps: TutorialStepDefinition[];
  nextPageId?: TutorialPageId;
  previousPageId?: TutorialPageId;
};

export const TUTORIAL_PAGE_ORDER: TutorialPageId[] = [
  "home",
  "articles",
  "forum",
  "ai-kentei",
  "dashboard",
];

export const TUTORIAL_PAGES: Record<TutorialPageId, TutorialPageDefinition> = {
  home: {
    id: "home",
    pathname: "/",
    nextPageId: "articles",
    steps: [
      {
        selector: '[data-tutorial="side-menu"]',
        title: "📚 左メニューでコンテンツを探そう",
        description:
          "記事・サービス・イベント・井戸端会議・AI検定など、教育に関するコンテンツがここから見つかります。",
      },
      {
        selector: '[data-tutorial="ai-navigator-open"]',
        title: "🤖 AIナビゲーターを使おう",
        description:
          "わからないことはAIに聞けます。ボタンを押すと対話が始まります。",
      },
      {
        selector:
          '[data-tutorial="header-user-menu-trigger"], [data-tutorial="header-mobile-menu-trigger"]',
        title: "👤 マイページはこちら",
        description:
          "お気に入りや閲覧履歴、アカウント設定の入口はここから確認できます。",
        nextLabel: "記事一覧を見てみよう",
      },
    ],
  },
  articles: {
    id: "articles",
    pathname: "/articles",
    previousPageId: "home",
    nextPageId: "forum",
    steps: [
      {
        selector: '[data-tutorial="articles-search"]',
        title: "🔍 キーワードで検索",
        description:
          "気になるテーマやキーワードで記事を絞り込めます。",
      },
      {
        selector: '[data-tutorial="articles-category-filter"]',
        title: "🏷️ カテゴリで絞り込む",
        description:
          "GIGAスクール・AI教育など、テーマ別に記事をフィルターできます。",
      },
      {
        selector: '[data-tutorial="article-card-favorite"]',
        title: "❤️ お気に入りに保存",
        description:
          "ハートボタンで気になった記事をブックマークできます。",
        nextLabel: "井戸端会議を見てみよう",
      },
    ],
  },
  forum: {
    id: "forum",
    pathname: "/forum",
    previousPageId: "articles",
    nextPageId: "ai-kentei",
    steps: [
      {
        selector: '[data-tutorial="forum-hero-section"]',
        title: "💬 井戸端会議へようこそ",
        description:
          "ここは教育に関する話題を自由に語り合えるコミュニティです。教員・専門家・保護者・企業など、立場を超えて繋がることができます。",
      },
      {
        selector: '[data-tutorial="forum-category-filter"]',
        title: "🏷️ カテゴリで絞り込む",
        description:
          "AI・テクノロジー、現場実践、制度・運営など、テーマ別に部屋をフィルターできます。興味のある分野から探しましょう。",
      },
      {
        selector: '[data-tutorial="forum-search"]',
        title: "🔍 キーワードで検索",
        description:
          "部屋名や説明から キーワードで検索できます。探している話題を素早く見つけられます。",
      },
      {
        selector: '[data-tutorial="forum-view-mode"]',
        title: "🗺️ 表示モードを切り替える",
        description:
          "マップ表示（視覚的）とリスト表示（詳細）を切り替えられます。好みの見方で部屋を探せます。",
      },
      {
        selector: '[data-tutorial="forum-thread-create"]',
        title: "📝 新しい部屋を作成",
        description:
          "新しいテーマの部屋を作成できます。AIディスカッション機能をONにすると、AIがファシリテーターとして議論をサポートします。",
      },
      {
        selector: '[data-tutorial="forum-ai-help"]',
        title: "🤖 AIに聞いてみよう",
        description:
          "わからないことがあったら、AIナビゲーターに質問しましょう。教育に関する相談や調べごとをAIがサポートします。",
        nextLabel: "AI検定に挑戦しよう",
      },
    ],
  },
  "ai-kentei": {
    id: "ai-kentei",
    pathname: "/ai-kentei",
    previousPageId: "forum",
    nextPageId: "dashboard",
    steps: [
      {
        selector: '[data-tutorial="side-menu-ai-kentei"]',
        title: "🏆 AI検定について",
        description:
          "AIに関する知識を問う検定です。クイズに挑戦してAIについてもっと学べます。",
      },
      {
        selector: '[data-tutorial="ai-kentei-quiz-start"]',
        title: "❓ クイズに挑戦",
        description:
          "AIに関する質問に答えるクイズに参加できます。正解数によってスコアが変わります。",
      },
      {
        selector: '[data-tutorial="ai-kentei-result"]',
        title: "📊 スコアを確認",
        description:
          "クイズ完了後、あなたのスコアと順位が表示されます。何度でも挑戦できます。",
        nextLabel: "マイページを見てみよう",
      },
    ],
  },
  dashboard: {
    id: "dashboard",
    pathname: "/dashboard",
    previousPageId: "ai-kentei",
    steps: [
      {
        selector: '[data-tutorial="dashboard-recent-history"]',
        title: "👁️ 閲覧履歴",
        description:
          "最近見た記事やサービスがここに表示されます。",
      },
      {
        selector: '[data-tutorial="dashboard-service-favorites"]',
        title: "📋 サービスのお気に入り",
        description:
          "気になるサービスをまとめて確認し、そのまま資料請求できます。",
      },
      {
        selector: '[data-tutorial="dashboard-ai-chat-history"]',
        title: "💬 チャット履歴",
        description:
          "AIナビゲーターとの会話はここで振り返れます。",
      },
    ],
  },
};

export function getTutorialPage(pageId: TutorialPageId) {
  return TUTORIAL_PAGES[pageId];
}

export function getTutorialStep(pageId: TutorialPageId, stepIndex: number) {
  return TUTORIAL_PAGES[pageId]?.steps[stepIndex] ?? null;
}

export function getTutorialTotalSteps() {
  return TUTORIAL_PAGE_ORDER.reduce(
    (total, pageId) => total + TUTORIAL_PAGES[pageId].steps.length,
    0
  );
}

export function getTutorialGlobalStepNumber(
  pageId: TutorialPageId,
  stepIndex: number
) {
  let count = 0;

  for (const currentPageId of TUTORIAL_PAGE_ORDER) {
    if (currentPageId === pageId) {
      return count + stepIndex + 1;
    }
    count += TUTORIAL_PAGES[currentPageId].steps.length;
  }

  return stepIndex + 1;
}

export function getTutorialPageIdFromPathname(
  pathname: string
): TutorialPageId | null {
  if (pathname === "/") return "home";
  if (pathname === "/articles") return "articles";
  if (pathname === "/dashboard") return "dashboard";
  return null;
}
