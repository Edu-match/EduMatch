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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay";
import { TutorialTooltip } from "@/components/tutorial/tutorial-tooltip";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { useAiPanel } from "@/components/layout/ai-panel-context";
import {
  TUTORIAL_DONE_STORAGE_KEY,
  TUTORIAL_PROGRESS_STORAGE_KEY,
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

function findVisibleElement(selector: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    candidates.find((candidate) => {
      const styles = window.getComputedStyle(candidate);
      return (
        candidate.getClientRects().length > 0 &&
        styles.display !== "none" &&
        styles.visibility !== "hidden"
      );
    }) ?? null
  );
}

function readDoneFlag() {
  return window.localStorage.getItem(TUTORIAL_DONE_STORAGE_KEY);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpen, setMobileOpen } = useAiPanel();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [tutorialState, setTutorialState] = useState<TutorialProgressState>(
    INITIAL_STATE
  );
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const completionTimerRef = useRef<number | null>(null);
  const aiPanelOpenedRef = useRef(false);

  // Keep a stable ref to nextStep so the element-resolution effect can call
  // the latest version without adding nextStep to its dependency array
  // (which would cause unnecessary reruns on every tutorialState change).
  const nextStepRef = useRef<() => void>(() => {});

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

      setTargetRect(null);
      updateTutorialState({
        active: true,
        pageId,
        stepIndex: 0,
      });
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
    setTargetRect(null);
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

  const skipTutorial = useCallback(() => {
    markTutorialDone("skipped");
    updateTutorialState({
      active: false,
      pageId: tutorialState.pageId,
      stepIndex: 0,
    });
    setTargetRect(null);
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

  // Keep the ref in sync with the latest nextStep
  useEffect(() => {
    nextStepRef.current = nextStep;
  });

  // Keyboard navigation: ← → for prev/next, Esc to skip
  useEffect(() => {
    if (!tutorialState.active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't steal keys from inputs / textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") skipTutorial();
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      if (e.key === "ArrowLeft") prevStep();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tutorialState.active, skipTutorial, nextStep, prevStep]);

  // Auto-open AI panel on AI navigator step
  useEffect(() => {
    if (!tutorialState.active) {
      aiPanelOpenedRef.current = false;
      return;
    }

    const currentPage = getTutorialPage(tutorialState.pageId);
    const isAiNavigatorStep =
      tutorialState.pageId === "home" && tutorialState.stepIndex === 1;

    if (isAiNavigatorStep && !aiPanelOpenedRef.current) {
      aiPanelOpenedRef.current = true;
      setOpen(true);
      setMobileOpen(true);
    } else if (!isAiNavigatorStep) {
      aiPanelOpenedRef.current = false;
    }
  }, [tutorialState.active, tutorialState.pageId, tutorialState.stepIndex, setOpen, setMobileOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedProgress = window.localStorage.getItem(
        TUTORIAL_PROGRESS_STORAGE_KEY
      );

      if (savedProgress && !readDoneFlag()) {
        const parsed = JSON.parse(savedProgress) as TutorialProgressState;
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

    return () => {
      clearCompletionTimer();
    };
  }, [clearCompletionTimer]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    const syncAuthState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setIsAuthenticated(!!user);
      }
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
  const currentStep =
    tutorialState.active && currentPageId === tutorialState.pageId
      ? getTutorialStep(tutorialState.pageId, tutorialState.stepIndex)
      : null;

  useEffect(() => {
    if (!isHydrated || isAuthenticated !== true) return;
    if (tutorialState.active) return;
    if (typeof window === "undefined" || readDoneFlag()) return;
    if (!currentPageId) return;
    if (window.localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)) return;

    startTutorial(currentPageId);
  }, [
    currentPageId,
    isAuthenticated,
    isHydrated,
    startTutorial,
    tutorialState.active,
  ]);

  useEffect(() => {
    if (!isHydrated || !tutorialState.active || !currentStep) {
      // Clear highlight when there is no active step (e.g. during page transitions)
      setTargetRect(null);
      return;
    }

    // Do NOT null targetRect here — keeping the old rect during element search
    // gives a smooth highlight transition instead of a visible flash.

    let cancelled = false;
    let retries = 0;
    let retryTimer: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let trackedElement: HTMLElement | null = null;

    let rafId: number | null = null;

    const updateRect = () => {
      if (!trackedElement || cancelled) return;
      setTargetRect(trackedElement.getBoundingClientRect());
    };

    const scheduleRectUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateRect();
      });
    };

    const observeTarget = () => {
      if (!trackedElement) return;

      trackedElement.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });

      updateRect();
      window.addEventListener("resize", scheduleRectUpdate);
      window.addEventListener("scroll", scheduleRectUpdate, true);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(scheduleRectUpdate);
        resizeObserver.observe(trackedElement);
      }
    };

    const cleanupListeners = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", scheduleRectUpdate);
      window.removeEventListener("scroll", scheduleRectUpdate, true);
      resizeObserver?.disconnect();
    };

    const resolveTarget = () => {
      if (cancelled) return;

      trackedElement = findVisibleElement(currentStep.selector);

      if (trackedElement) {
        observeTarget();
        return;
      }

      retries += 1;
      if (retries >= 8) {
        // Element not found — show tooltip without overlay highlight,
        // then auto-advance after a brief pause so the user isn't stuck.
        if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
          console.warn(
            `[Tutorial] Element not found after 8 retries: ${currentStep.selector}`,
            { pageId: tutorialState.pageId, stepIndex: tutorialState.stepIndex }
          );
        }
        setTargetRect(null);
        window.setTimeout(() => {
          if (!cancelled) nextStepRef.current();
        }, 800);
        return;
      }

      retryTimer = window.setTimeout(resolveTarget, 250);
    };

    resolveTarget();

    return () => {
      cancelled = true;
      cleanupListeners();
    };
  }, [currentStep, isHydrated, tutorialState.active]);

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
        <>
          {targetRect && <TutorialOverlay targetRect={targetRect} />}
          <TutorialTooltip
            currentStepNumber={currentStepNumber}
            totalSteps={totalSteps}
            canGoBack={currentStepNumber > 1}
            isLastStep={currentStepNumber === totalSteps}
            step={currentStep}
            pageId={tutorialState.pageId}
            targetRect={targetRect}
            onSkip={skipTutorial}
            onPrev={prevStep}
            onNext={nextStep}
          />
        </>
      )}

      {showCompletionMessage && (
        <div className="pointer-events-none fixed inset-0 z-[95] flex items-end justify-center pb-16 px-4 sm:items-center sm:pb-0">
          <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-6 text-center shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300 motion-reduce:animate-none">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-lg font-bold text-white">チュートリアル完了！</p>
            <p className="text-sm text-orange-100 mt-1">EduMatchをお楽しみください</p>
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
