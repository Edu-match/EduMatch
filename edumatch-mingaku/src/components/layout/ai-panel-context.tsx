"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AI_KENTEI_CHAT_BLOCKED_MESSAGE } from "@/lib/ai-kentei-exam-guard-shared";
import { useAiKenteiExamBlocksChat } from "@/hooks/use-ai-kentei-exam-blocks-chat";

const STORAGE_KEY = "edumatch-ai-panel-open";

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
  open: true,
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
  const [open, setOpenState] = useState(true);
  const [mobileOpen, setMobileOpenState] = useState(false);
  const [pendingActivation, setPendingActivation] = useState<AutoActivation | null>(null);
  const [pendingChatLaunch, setPendingChatLaunch] = useState<ChatLaunchDetail | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "false") setOpenState(false);
      } catch {
        // localStorage unavailable
      }
    }
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
          localStorage.setItem(STORAGE_KEY, "true");
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
      localStorage.setItem(STORAGE_KEY, String(next));
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
