"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TutorialSpotlight } from "@/components/tutorial/tutorial-spotlight";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  TUTORIAL_DONE_STORAGE_KEY,
  TUTORIAL_EVENT_NAME,
  TUTORIAL_PROGRESS_STORAGE_KEY,
  TUTORIAL_SKIPPED_STORAGE_KEY,
  TUTORIAL_PAGES,
  getTutorialGlobalStepNumber,
  getTutorialPage,
  getTutorialPageIdFromPathname,
  getTutorialStep,
  getTutorialTotalSteps,
  type TutorialPageId,
} from "@/components/tutorial/tutorial-steps";

type TutorialProgressState = {
  active: boolean;
  pageId: TutorialPageId;
  stepIndex: number;
};

export type TutorialContextValue = {
  isActive: boolean;
  currentPageId: TutorialPageId | null;
  currentStepIndex: number;
  startTutorial: (
    pageId?: TutorialPageId,
    options?: { force?: boolean }
  ) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
};

const INITIAL_STATE: TutorialProgressState = {
  active: false,
  pageId: "home",
  stepIndex: 0,
};

export const TutorialContext = createContext<TutorialContextValue | null>(null);

function readDoneFlag() {
  return window.localStorage.getItem(TUTORIAL_DONE_STORAGE_KEY);
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [tutorialState, setTutorialState] = useState<TutorialProgressState>(
    INITIAL_STATE
  );
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [completionGuideHref, setCompletionGuideHref] = useState("/help");
  const completionTimerRef = useRef<number | null>(null);
  const lastOnEnterRef = useRef<string | null>(null);

  const persistProgress = useCallback((nextState: TutorialProgressState) => {
    if (typeof window === "undefined") return;
    if (nextState.active) {
      window.localStorage.setItem(
        TUTORIAL_PROGRESS_STORAGE_KEY,
        JSON.stringify(nextState)
      );
      return;
    }
    window.localStorage.removeItem(TUTORIAL_PROGRESS_STORAGE_KEY);
  }, []);

  const updateTutorialState = useCallback(
    (nextState: TutorialProgressState) => {
      setTutorialState(nextState);
      persistProgress(nextState);
    },
    [persistProgress]
  );

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const clearTutorialStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TUTORIAL_DONE_STORAGE_KEY);
    window.localStorage.removeItem(TUTORIAL_PROGRESS_STORAGE_KEY);
  }, []);

  const markTutorialDone = useCallback(
    (status: "completed" | "skipped") => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(TUTORIAL_DONE_STORAGE_KEY, status);
      window.localStorage.removeItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    },
    []
  );

  const startTutorial = useCallback(
    (pageId: TutorialPageId = "home", options?: { force?: boolean }) => {
      if (typeof window === "undefined") return;
      if (!options?.force && readDoneFlag()) return;
      if (options?.force) {
        clearTutorialStorage();
        clearCompletionTimer();
        setShowCompletionMessage(false);
      }
      lastOnEnterRef.current = null;
      updateTutorialState({ active: true, pageId, stepIndex: 0 });
    },
    [clearCompletionTimer, clearTutorialStorage, updateTutorialState]
  );

  const completeTutorial = useCallback(() => {
    if (typeof window === "undefined") return;
    markTutorialDone("completed");
    updateTutorialState({
      active: false,
      pageId: tutorialState.pageId,
      stepIndex: 0,
    });
    setShowCompletionMessage(true);
    clearCompletionTimer();
    completionTimerRef.current = window.setTimeout(() => {
      setShowCompletionMessage(false);
      completionTimerRef.current = null;
    }, 3000);
  }, [
    clearCompletionTimer,
    markTutorialDone,
    tutorialState.pageId,
    updateTutorialState,
  ]);

  useEffect(() => {
    if (!showCompletionMessage) return;
    let cancelled = false;
    fetch("/api/help/guide-link", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { href?: string } | null) => {
        if (cancelled) return;
        if (data?.href && typeof data.href === "string") {
          setCompletionGuideHref(data.href);
        } else {
          setCompletionGuideHref("/help");
        }
      })
      .catch(() => {
        if (!cancelled) setCompletionGuideHref("/help");
      });
    return () => {
      cancelled = true;
    };
  }, [showCompletionMessage]);

  const skipTutorial = useCallback(() => {
    markTutorialDone("skipped");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TUTORIAL_SKIPPED_STORAGE_KEY, "true");
    }
    updateTutorialState({
      active: false,
      pageId: tutorialState.pageId,
      stepIndex: 0,
    });
  }, [markTutorialDone, tutorialState.pageId, updateTutorialState]);

  const nextStep = useCallback(() => {
    const currentPage = getTutorialPage(tutorialState.pageId);
    if (!currentPage) return;

    if (tutorialState.stepIndex < currentPage.steps.length - 1) {
      updateTutorialState({
        ...tutorialState,
        stepIndex: tutorialState.stepIndex + 1,
      });
      return;
    }

    if (currentPage.nextPageId) {
      const nextPage = getTutorialPage(currentPage.nextPageId);
      updateTutorialState({
        active: true,
        pageId: currentPage.nextPageId,
        stepIndex: 0,
      });
      router.push(nextPage.pathname);
      return;
    }

    completeTutorial();
  }, [completeTutorial, router, tutorialState, updateTutorialState]);

  const prevStep = useCallback(() => {
    const currentPage = getTutorialPage(tutorialState.pageId);
    if (!currentPage) return;

    if (tutorialState.stepIndex > 0) {
      updateTutorialState({
        ...tutorialState,
        stepIndex: tutorialState.stepIndex - 1,
      });
      return;
    }

    if (currentPage.previousPageId) {
      const previousPage = getTutorialPage(currentPage.previousPageId);
      updateTutorialState({
        active: true,
        pageId: currentPage.previousPageId,
        stepIndex: previousPage.steps.length - 1,
      });
      router.push(previousPage.pathname);
    }
  }, [router, tutorialState, updateTutorialState]);

  // ── Restore saved progress on first hydration ──────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
      if (saved && !readDoneFlag()) {
        const parsed = JSON.parse(saved) as TutorialProgressState;
        if (
          parsed?.active === true &&
          parsed.pageId in TUTORIAL_PAGES &&
          Number.isInteger(parsed.stepIndex)
        ) {
          setTutorialState(parsed);
        }
      }
    } catch {
      window.localStorage.removeItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
    return () => clearCompletionTimer();
  }, [clearCompletionTimer]);

  // ── Track auth state ────────────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    const syncAuthState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (mounted) setIsAuthenticated(!!user);
    };

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const currentPageId = getTutorialPageIdFromPathname(pathname);
  // 特設サイト(interop / special.* サブドメイン)では本体のチュートリアルを出さない
  const isInteropContext =
    !!pathname?.startsWith("/interop") ||
    (typeof window !== "undefined" && window.location.hostname.startsWith("special."));
  const currentStep =
    !isInteropContext && tutorialState.active && currentPageId === tutorialState.pageId
      ? getTutorialStep(tutorialState.pageId, tutorialState.stepIndex)
      : null;

  // ── Auto-start when an authenticated user lands on a known page ──
  useEffect(() => {
    if (isInteropContext) return;
    if (!isHydrated || isAuthenticated !== true) return;
    if (tutorialState.active) return;
    if (typeof window === "undefined" || readDoneFlag()) return;
    if (!currentPageId) return;
    if (window.localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)) return;

    startTutorial(currentPageId);
  }, [
    currentPageId,
    isInteropContext,
    isAuthenticated,
    isHydrated,
    startTutorial,
    tutorialState.active,
  ]);

  // ── Fire one-shot side effects when a step becomes active ──
  useEffect(() => {
    if (!currentStep) {
      lastOnEnterRef.current = null;
      return;
    }
    const stepKey = `${tutorialState.pageId}:${tutorialState.stepIndex}`;
    if (lastOnEnterRef.current === stepKey) return;
    lastOnEnterRef.current = stepKey;

    if (currentStep.onEnter === "open-ai-chat") {
      // Dispatch the same event used by the rest of the app to open
      // the AI panel — keeps the tutorial decoupled from AiPanelContext.
      window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: {} }));
    }
  }, [currentStep, tutorialState.pageId, tutorialState.stepIndex]);

  // ── Listen for interaction events ──────────────────────────
  useEffect(() => {
    if (!tutorialState.active || !currentStep) return;
    if (currentStep.kind !== "interaction" || !currentStep.interactionEvent) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail;
      if (!detail || detail.name !== currentStep.interactionEvent) return;
      nextStep();
    };

    window.addEventListener(TUTORIAL_EVENT_NAME, handler);
    return () => window.removeEventListener(TUTORIAL_EVENT_NAME, handler);
  }, [currentStep, nextStep, tutorialState.active]);

  // ── Keyboard navigation ────────────────────────────────────
  useEffect(() => {
    if (!tutorialState.active || !currentStep) return;

    const isInteractionWaiting = currentStep.kind === "interaction";

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        skipTutorial();
        return;
      }
      if (e.key === "ArrowLeft") {
        prevStep();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (!isInteractionWaiting) nextStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, nextStep, prevStep, skipTutorial, tutorialState.active]);

  const totalSteps = useMemo(() => getTutorialTotalSteps(), []);
  const currentStepNumber = currentStep
    ? getTutorialGlobalStepNumber(tutorialState.pageId, tutorialState.stepIndex)
    : 0;

  const contextValue = useMemo<TutorialContextValue>(
    () => ({
      isActive: tutorialState.active,
      currentPageId: tutorialState.active ? tutorialState.pageId : null,
      currentStepIndex: tutorialState.stepIndex,
      startTutorial,
      nextStep,
      prevStep,
      skipTutorial,
      completeTutorial,
    }),
    [
      completeTutorial,
      nextStep,
      prevStep,
      skipTutorial,
      startTutorial,
      tutorialState.active,
      tutorialState.pageId,
      tutorialState.stepIndex,
    ]
  );

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <TutorialQueryStarter
          isHydrated={isHydrated}
          onStartTutorial={startTutorial}
        />
      </Suspense>

      {currentStep && (
        <TutorialSpotlight
          key={`${tutorialState.pageId}:${tutorialState.stepIndex}`}
          step={currentStep}
          pageId={tutorialState.pageId}
          currentStepNumber={currentStepNumber}
          totalSteps={totalSteps}
          canGoBack={currentStepNumber > 1}
          isLastStep={currentStepNumber === totalSteps}
          isWaitingInteraction={currentStep.kind === "interaction"}
          onSkip={skipTutorial}
          onPrev={prevStep}
          onNext={nextStep}
        />
      )}

      {showCompletionMessage && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center pb-16 px-4 sm:items-center sm:pb-0">
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-6 text-center shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-lg font-bold text-white">チュートリアル完了！</p>
            <p className="text-sm text-orange-100 mt-1">
              EduMatchをお楽しみください
            </p>
            <div className="mt-3">
              <Link
                href={completionGuideHref}
                className="inline-flex rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50"
              >
                詳細はこちら
              </Link>
            </div>
          </div>
        </div>
      )}

    </TutorialContext.Provider>
  );
}

function TutorialQueryStarter({
  isHydrated,
  onStartTutorial,
}: {
  isHydrated: boolean;
  onStartTutorial: (
    pageId?: TutorialPageId,
    options?: { force?: boolean }
  ) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isHydrated) return;
    if (pathname !== "/") return;
    if (searchParams.get("tutorial") !== "start") return;
    if (typeof window === "undefined" || readDoneFlag()) return;

    onStartTutorial("home");

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("tutorial");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [isHydrated, onStartTutorial, pathname, router, searchParams]);

  return null;
}
