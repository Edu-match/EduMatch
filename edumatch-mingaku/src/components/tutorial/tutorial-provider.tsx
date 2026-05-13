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
  startTutorial: (pageId?: TutorialPageId) => void;
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
  const [isHydrated, setIsHydrated] = useState(false);
  const [tutorialState, setTutorialState] = useState<TutorialProgressState>(
    INITIAL_STATE
  );
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const completionTimerRef = useRef<number | null>(null);

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

  const markTutorialDone = useCallback(
    (status: "completed" | "skipped") => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(TUTORIAL_DONE_STORAGE_KEY, status);
      window.localStorage.removeItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    },
    []
  );

  const startTutorial = useCallback(
    (pageId: TutorialPageId = "home") => {
      if (typeof window === "undefined" || readDoneFlag()) return;

      updateTutorialState({
        active: true,
        pageId,
        stepIndex: 0,
      });
    },
    [updateTutorialState]
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
    }, 1000);
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

  const currentPageId = getTutorialPageIdFromPathname(pathname);
  const currentStep =
    tutorialState.active && currentPageId === tutorialState.pageId
      ? getTutorialStep(tutorialState.pageId, tutorialState.stepIndex)
      : null;

  useEffect(() => {
    if (!isHydrated || !tutorialState.active || !currentStep) {
      setTargetRect(null);
      return;
    }

    setTargetRect(null);

    let cancelled = false;
    let retries = 0;
    let retryTimer: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let trackedElement: HTMLElement | null = null;

    const updateRect = () => {
      if (!trackedElement || cancelled) return;
      setTargetRect(trackedElement.getBoundingClientRect());
    };

    const observeTarget = () => {
      if (!trackedElement) return;

      trackedElement.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });

      updateRect();
      window.addEventListener("resize", updateRect);
      window.addEventListener("scroll", updateRect, true);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateRect);
        resizeObserver.observe(trackedElement);
      }
    };

    const cleanupTarget = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
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
        setTargetRect(null);
        window.setTimeout(() => {
          if (!cancelled) nextStep();
        }, 0);
        return;
      }

      retryTimer = window.setTimeout(resolveTarget, 250);
    };

    resolveTarget();

    return () => {
      cancelled = true;
      cleanupTarget();
    };
  }, [currentStep, isHydrated, nextStep, tutorialState.active]);

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

      {currentStep && targetRect && (
        <>
          <TutorialOverlay targetRect={targetRect} />
          <TutorialTooltip
            currentStepNumber={currentStepNumber}
            totalSteps={totalSteps}
            canGoBack={currentStepNumber > 1}
            isLastStep={currentStepNumber === totalSteps}
            step={currentStep}
            targetRect={targetRect}
            onSkip={skipTutorial}
            onPrev={prevStep}
            onNext={nextStep}
          />
        </>
      )}

      {showCompletionMessage && (
        <div className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center px-4">
          <div className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
            準備完了です！🎉 EduMatchをお楽しみください
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
  onStartTutorial: (pageId?: TutorialPageId) => void;
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
