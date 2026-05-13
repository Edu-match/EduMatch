export const TUTORIAL_DONE_STORAGE_KEY = "edu_match_tutorial_done";
export const TUTORIAL_PROGRESS_STORAGE_KEY = "edu_match_tutorial_progress";

export type TutorialPageId = "home" | "articles" | "dashboard";

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
  "dashboard",
];

export const TUTORIAL_PAGES: Record<TutorialPageId, TutorialPageDefinition> = {
  home: {
    id: "home",
    pathname: "/",
    nextPageId: "articles",
    steps: [
      {
        selector:
          '[data-tutorial="header-nav"], [data-tutorial="header-mobile-menu-trigger"]',
        title: "📚 コンテンツを探そう",
        description:
          "記事・サービス・イベントなど、教育に関するコンテンツがここから見つかります。",
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
    nextPageId: "dashboard",
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
        nextLabel: "マイページを見てみよう",
      },
    ],
  },
  dashboard: {
    id: "dashboard",
    pathname: "/dashboard",
    previousPageId: "articles",
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
