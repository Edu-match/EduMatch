"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AI_KENTEI_CHAT_BLOCKED_MESSAGE } from "@/lib/ai-kentei-exam-guard-shared";
import { useAiKenteiExamBlocksChat } from "@/hooks/use-ai-kentei-exam-blocks-chat";

// セッション内でユーザーが明示的に閉じたかを記憶するキー。
// sessionStorage を使うことで「同一セッション中は再オープンしない」が、
// 次回のセッション（新規タブ/再訪）では中核機能として再び開く。
const SESSION_CLOSED_KEY = "edumatch-ai-panel-user-closed";
// デスクトップ判定（この幅以上でパネルを既定オープン）
const DESKTOP_QUERY = "(min-width: 1024px)";

export type AutoActivation = {
  articleId: string;
  articleTitle: string;
  question: string;
};

export type ChatLaunchDetail = {
  initialMessage?: string;
  preferredMode?: "navigator" | "debate" | "discussion";
  launchContext?: "default" | "forum-compose";
  forumTopic?: string;
};

type AiPanelContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  pendingActivation: AutoActivation | null;
  clearActivation: () => void;
  triggerArticleComplete: (articleId: string, articleTitle: string) => void;
  pendingChatLaunch: ChatLaunchDetail | null;
  clearPendingChatLaunch: () => void;
};

const AiPanelContext = createContext<AiPanelContextValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  pendingActivation: null,
  clearActivation: () => {},
  triggerArticleComplete: () => {},
  pendingChatLaunch: null,
  clearPendingChatLaunch: () => {},
});

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const examBlocksChat = useAiKenteiExamBlocksChat();
  // SSR/初期レンダは閉じた状態から始め、マウント後の effect でデスクトップのみ既定オープンにする。
  // （open=true を SSR で描画するとモバイルとの hydration 差異や一瞬のちらつきの原因になるため）
  const [open, setOpenState] = useState(false);
  const [mobileOpen, setMobileOpenState] = useState(false);
  const [pendingActivation, setPendingActivation] = useState<AutoActivation | null>(null);
  const [pendingChatLaunch, setPendingChatLaunch] = useState<ChatLaunchDetail | null>(null);
  const initialized = useRef(false);

  // 初回マウント時のみ、デスクトップかつユーザーがこのセッションで閉じていなければ既定オープン。
  // ルート遷移では Provider は再マウントされないため、再オープンが繰り返されることはない。
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (examBlocksChat) return; // AI検定受験中は開かない
    try {
      const userClosed = sessionStorage.getItem(SESSION_CLOSED_KEY) === "true";
      const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
      if (isDesktop && !userClosed) {
        setOpenState(true);
      }
    } catch {
      // sessionStorage / matchMedia unavailable
    }
    // examBlocksChat は初期値のみ参照（初回マウント時判定）。以降は別 effect が制御。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      if (examBlocksChat) {
        toast.error(AI_KENTEI_CHAT_BLOCKED_MESSAGE);
        return;
      }
      const detail = (event as CustomEvent<ChatLaunchDetail>).detail ?? {};
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        setMobileOpenState(true);
      } else {
        setOpenState(true);
        try {
          sessionStorage.removeItem(SESSION_CLOSED_KEY);
        } catch {
          /* ignore */
        }
      }
      setPendingChatLaunch(detail);
    };
    window.addEventListener("open-ai-chat", handler);
    return () => window.removeEventListener("open-ai-chat", handler);
  }, [examBlocksChat]);

  useEffect(() => {
    if (!examBlocksChat) return;
    setOpenState(false);
    setMobileOpenState(false);
    setPendingChatLaunch(null);
    setPendingActivation(null);
  }, [examBlocksChat]);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      // ユーザーが明示的に閉じたら、このセッション中は自動オープンさせない。
      // 開いた場合はフラグを解除する。
      if (next) {
        sessionStorage.removeItem(SESSION_CLOSED_KEY);
      } else {
        sessionStorage.setItem(SESSION_CLOSED_KEY, "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const setMobileOpen = useCallback((next: boolean) => {
    setMobileOpenState(next);
  }, []);

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const clearActivation = useCallback(() => {
    setPendingActivation(null);
  }, []);

  const clearPendingChatLaunch = useCallback(() => {
    setPendingChatLaunch(null);
  }, []);

  const triggerArticleComplete = useCallback(
    (articleId: string, articleTitle: string) => {
      if (examBlocksChat) return;
      const question = `「${articleTitle}」を読み終えましたね。この記事の内容についてAIと話しますか？`;
      setPendingActivation({ articleId, articleTitle, question });
      setOpen(true);
      setMobileOpenState(true);
    },
    [setOpen, examBlocksChat]
  );

  return (
    <AiPanelContext.Provider
      value={{
        open,
        setOpen,
        toggle,
        mobileOpen,
        setMobileOpen,
        pendingActivation,
        clearActivation,
        triggerArticleComplete,
        pendingChatLaunch,
        clearPendingChatLaunch,
      }}
    >
      {children}
    </AiPanelContext.Provider>
  );
}

export function useAiPanel() {
  return useContext(AiPanelContext);
}
