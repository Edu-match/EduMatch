"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TutorialStepDefinition } from "@/components/tutorial/tutorial-steps";

type Placement = "top" | "bottom" | "left" | "right";

type TooltipLayout = {
  top: number;
  left: number;
  placement: Placement;
  arrowOffset: number;
};

type TutorialTooltipProps = {
  currentStepNumber: number;
  totalSteps: number;
  canGoBack: boolean;
  isLastStep: boolean;
  step: TutorialStepDefinition;
  targetRect: DOMRect | null;
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
};

const VIEWPORT_PADDING = 12;
const TOOLTIP_GAP = 18;
const DEFAULT_TOOLTIP_WIDTH = 320;
const DEFAULT_TOOLTIP_HEIGHT = 220;
const DEFAULT_LAYOUT: TooltipLayout = {
  top: VIEWPORT_PADDING,
  left: VIEWPORT_PADDING,
  placement: "bottom",
  arrowOffset: 48,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function TutorialTooltip({
  currentStepNumber,
  totalSteps,
  canGoBack,
  isLastStep,
  step,
  targetRect,
  onSkip,
  onPrev,
  onNext,
}: TutorialTooltipProps) {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const layout = useMemo<TooltipLayout>(() => {
    if (!targetRect) return DEFAULT_LAYOUT;

    const tooltipWidth = Math.min(
      Math.max(viewport.width - VIEWPORT_PADDING * 2, 240),
      DEFAULT_TOOLTIP_WIDTH
    );
    const tooltipHeight = DEFAULT_TOOLTIP_HEIGHT;
    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const spaces = {
      top: targetRect.top,
      bottom: viewportHeight - targetRect.bottom,
      left: targetRect.left,
      right: viewportWidth - targetRect.right,
    };

    let placement: Placement = "bottom";

    if (spaces.bottom >= tooltipHeight + TOOLTIP_GAP) {
      placement = "bottom";
    } else if (spaces.top >= tooltipHeight + TOOLTIP_GAP) {
      placement = "top";
    } else if (spaces.right >= tooltipWidth + TOOLTIP_GAP) {
      placement = "right";
    } else if (spaces.left >= tooltipWidth + TOOLTIP_GAP) {
      placement = "left";
    } else {
      placement = spaces.bottom >= spaces.top ? "bottom" : "top";
    }

    let top = VIEWPORT_PADDING;
    let left = VIEWPORT_PADDING;
    let arrowOffset = 48;

    if (placement === "bottom") {
      top = clamp(
        targetRect.bottom + TOOLTIP_GAP,
        VIEWPORT_PADDING,
        viewportHeight - tooltipHeight - VIEWPORT_PADDING
      );
      left = clamp(
        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        VIEWPORT_PADDING,
        viewportWidth - tooltipWidth - VIEWPORT_PADDING
      );
      arrowOffset = clamp(
        targetRect.left + targetRect.width / 2 - left,
        28,
        tooltipWidth - 28
      );
    } else if (placement === "top") {
      top = clamp(
        targetRect.top - tooltipHeight - TOOLTIP_GAP,
        VIEWPORT_PADDING,
        viewportHeight - tooltipHeight - VIEWPORT_PADDING
      );
      left = clamp(
        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        VIEWPORT_PADDING,
        viewportWidth - tooltipWidth - VIEWPORT_PADDING
      );
      arrowOffset = clamp(
        targetRect.left + targetRect.width / 2 - left,
        28,
        tooltipWidth - 28
      );
    } else if (placement === "right") {
      top = clamp(
        targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        VIEWPORT_PADDING,
        viewportHeight - tooltipHeight - VIEWPORT_PADDING
      );
      left = clamp(
        targetRect.right + TOOLTIP_GAP,
        VIEWPORT_PADDING,
        viewportWidth - tooltipWidth - VIEWPORT_PADDING
      );
      arrowOffset = clamp(
        targetRect.top + targetRect.height / 2 - top,
        28,
        tooltipHeight - 28
      );
    } else {
      top = clamp(
        targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        VIEWPORT_PADDING,
        viewportHeight - tooltipHeight - VIEWPORT_PADDING
      );
      left = clamp(
        targetRect.left - tooltipWidth - TOOLTIP_GAP,
        VIEWPORT_PADDING,
        viewportWidth - tooltipWidth - VIEWPORT_PADDING
      );
      arrowOffset = clamp(
        targetRect.top + targetRect.height / 2 - top,
        28,
        tooltipHeight - 28
      );
    }

    return { top, left, placement, arrowOffset };
  }, [targetRect, viewport.height, viewport.width]);

  const rotateClass = useMemo(() => {
    const rotateClasses = ["rotate-1", "-rotate-1", "rotate-[0.6deg]"];
    return rotateClasses[(currentStepNumber - 1) % rotateClasses.length];
  }, [currentStepNumber]);

  const nextLabel =
    step.nextLabel ?? (isLastStep ? "チュートリアルを完了する 🎉" : "次へ →");

  return (
    <div
      role="dialog"
      aria-live="polite"
      className={cn(
        "fixed z-[90] w-[min(calc(100vw-1.5rem),20rem)] max-w-sm rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.22)]",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200",
        "motion-reduce:animate-none",
        rotateClass
      )}
      style={{
        top: layout.top,
        left: layout.left,
      }}
    >
      <div className="absolute left-6 top-[-8px] h-4 w-16 -rotate-6 rounded-sm bg-yellow-200/80 shadow-sm" />

      <TooltipArrow placement={layout.placement} offset={layout.arrowOffset} />

      <div className="relative space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-yellow-700">
            📌 ステップ {currentStepNumber} / {totalSteps}
          </p>
          <div className="space-y-1">
            <h2 className="text-base font-bold leading-snug sm:text-lg">
              {step.title}
            </h2>
            <p className="text-sm leading-6 text-slate-700">{step.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:bg-yellow-100 hover:text-slate-900"
            onClick={onSkip}
          >
            スキップ
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canGoBack}
            className="border-yellow-300 bg-white/80 hover:bg-white"
            onClick={onPrev}
          >
            ← 戻る
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-orange-500 text-white hover:bg-orange-400"
            onClick={onNext}
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TooltipArrow({
  placement,
  offset,
}: {
  placement: Placement;
  offset: number;
}) {
  if (placement === "bottom") {
    return (
      <span
        aria-hidden
        className="absolute -top-3 h-0 w-0 border-x-[12px] border-b-[12px] border-x-transparent border-b-yellow-200"
        style={{ left: offset - 12 }}
      >
        <span className="absolute left-[-10px] top-[2px] h-0 w-0 border-x-[10px] border-b-[10px] border-x-transparent border-b-yellow-50" />
      </span>
    );
  }

  if (placement === "top") {
    return (
      <span
        aria-hidden
        className="absolute -bottom-3 h-0 w-0 border-x-[12px] border-t-[12px] border-x-transparent border-t-yellow-200"
        style={{ left: offset - 12 }}
      >
        <span className="absolute left-[-10px] top-[-12px] h-0 w-0 border-x-[10px] border-t-[10px] border-x-transparent border-t-yellow-50" />
      </span>
    );
  }

  if (placement === "right") {
    return (
      <span
        aria-hidden
        className="absolute -left-3 h-0 w-0 border-y-[12px] border-r-[12px] border-y-transparent border-r-yellow-200"
        style={{ top: offset - 12 }}
      >
        <span className="absolute left-[2px] top-[-10px] h-0 w-0 border-y-[10px] border-r-[10px] border-y-transparent border-r-yellow-50" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="absolute -right-3 h-0 w-0 border-y-[12px] border-l-[12px] border-y-transparent border-l-yellow-200"
      style={{ top: offset - 12 }}
    >
      <span className="absolute left-[-12px] top-[-10px] h-0 w-0 border-y-[10px] border-l-[10px] border-y-transparent border-l-yellow-50" />
    </span>
  );
}
