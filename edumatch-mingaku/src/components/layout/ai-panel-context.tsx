"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "edumatch-ai-panel-open";

export type AutoActivation = {
  articleId: string;
  articleTitle: string;
  question: string;
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
});

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(true);
  const [mobileOpen, setMobileOpenState] = useState(false);
  const [pendingActivation, setPendingActivation] = useState<AutoActivation | null>(null);
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

  const triggerArticleComplete = useCallback(
    (articleId: string, articleTitle: string) => {
      const question = `「${articleTitle}」を読み終えましたね。この記事の内容についてAIと話しますか？`;
      setPendingActivation({ articleId, articleTitle, question });
      setOpen(true);
      setMobileOpenState(true);
    },
    [setOpen]
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
      }}
    >
      {children}
    </AiPanelContext.Provider>
  );
}

export function useAiPanel() {
  return useContext(AiPanelContext);
}
