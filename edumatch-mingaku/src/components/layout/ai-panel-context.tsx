"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "edumatch-ai-panel-open";

export type AutoActivation = {
  articleId: string;
  articleTitle: string;
  question: string;
};

type AiPanelContextValue = {
  /** デスクトップAIサイドパネルの開閉 */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** モバイルドロワーの開閉 */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** 左サイドバーの開閉（AIパネルと連携） */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** 記事読了時の自動アクティベーション */
  pendingActivation: AutoActivation | null;
  clearActivation: () => void;
  triggerArticleComplete: (articleId: string, articleTitle: string) => void;
};

const AiPanelContext = createContext<AiPanelContextValue>({
  open: true,
  setOpen: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  sidebarOpen: true,
  setSidebarOpen: () => {},
  pendingActivation: null,
  clearActivation: () => {},
  triggerArticleComplete: () => {},
});

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(true);
  const [mobileOpen, setMobileOpenState] = useState(false);
  const [sidebarOpen, setSidebarOpenState] = useState(true);
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
    // AIパネルを開くとサイドバーを閉じる（スペース確保）
    if (next) setSidebarOpenState(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  }, []);

  const setMobileOpen = useCallback((next: boolean) => {
    setMobileOpenState(next);
  }, []);

  /** サイドバーを開くとAIパネルを閉じる（相互排他） */
  const setSidebarOpen = useCallback(
    (next: boolean) => {
      setSidebarOpenState(next);
      if (next) setOpen(false);
    },
    [setOpen]
  );

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
        mobileOpen,
        setMobileOpen,
        sidebarOpen,
        setSidebarOpen,
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
