"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TUTORIAL_PAGE_LABELS,
  type TutorialPageId,
  type TutorialStepDefinition,
} from "@/components/tutorial/tutorial-steps";

const HIGHLIGHT_PADDING = 8;
const TOOLTIP_GAP = 18;
const VIEWPORT_PADDING = 12;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_FALLBACK_HEIGHT = 260;
const ELEMENT_RETRY_FRAMES = 60; // ~1s at 60fps

type Placement = "top" | "bottom" | "left" | "right";

type TutorialSpotlightProps = {
  step: TutorialStepDefinition;
  pageId: TutorialPageId;
  currentStepNumber: number;
  totalSteps: number;
  canGoBack: boolean;
  isLastStep: boolean;
  isWaitingInteraction: boolean;
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function findVisibleElement(selector: string): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(selector)
  );
  return (
    candidates.find((candidate) => {
      if (candidate.getClientRects().length === 0) return false;
      const styles = window.getComputedStyle(candidate);
      return styles.display !== "none" && styles.visibility !== "hidden";
    }) ?? null
  );
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function TutorialSpotlight({
  step,
  pageId,
  currentStepNumber,
  totalSteps,
  canGoBack,
  isLastStep,
  isWaitingInteraction,
  onSkip,
  onPrev,
  onNext,
}: TutorialSpotlightProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const arrowInnerRef = useRef<HTMLSpanElement>(null);
  const [targetMissing, setTargetMissing] = useState(false);

  const rotateClass = useMemo(() => {
    const rs = ["rotate-1", "-rotate-1", "rotate-[0.6deg]"];
    return rs[(currentStepNumber - 1) % rs.length];
  }, [currentStepNumber]);

  useEffect(() => {
    const selector = step.selector;
    let cancelled = false;
    let rafId: number | null = null;
    let trackedElement: HTMLElement | null = null;
    let retries = 0;
    let scrolledIntoView = false;

    const placeCenteredTooltip = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tw = Math.min(
        Math.max(vw - VIEWPORT_PADDING * 2, 240),
        TOOLTIP_WIDTH
      );
      const th = tooltip.offsetHeight || TOOLTIP_FALLBACK_HEIGHT;
      tooltip.style.width = `${tw}px`;
      const left = (vw - tw) / 2;
      const top = clamp(
        vh - th - 80,
        VIEWPORT_PADDING,
        vh - th - VIEWPORT_PADDING
      );
      tooltip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      tooltip.style.opacity = "1";
      if (arrowRef.current) arrowRef.current.style.display = "none";
      if (backdropRef.current) backdropRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };

    const applyLayout = () => {
      if (!trackedElement || cancelled) return;
      const rect = trackedElement.getBoundingClientRect();

      // If the element somehow shrinks to 0 (e.g., hidden during a transition),
      // bail to centered tooltip rather than showing a broken highlight.
      if (rect.width === 0 || rect.height === 0) {
        if (backdropRef.current) backdropRef.current.style.opacity = "0";
        if (ringRef.current) ringRef.current.style.opacity = "0";
        placeCenteredTooltip();
        return;
      }

      const boxTop = Math.max(rect.top - HIGHLIGHT_PADDING, 4);
      const boxLeft = Math.max(rect.left - HIGHLIGHT_PADDING, 4);
      const boxWidth = Math.max(rect.width + HIGHLIGHT_PADDING * 2, 32);
      const boxHeight = Math.max(rect.height + HIGHLIGHT_PADDING * 2, 32);

      const backdrop = backdropRef.current;
      const ring = ringRef.current;
      const tooltip = tooltipRef.current;
      const arrow = arrowRef.current;
      const arrowInner = arrowInnerRef.current;

      if (backdrop) {
        backdrop.style.transform = `translate3d(${boxLeft}px, ${boxTop}px, 0)`;
        backdrop.style.width = `${boxWidth}px`;
        backdrop.style.height = `${boxHeight}px`;
        backdrop.style.opacity = "1";
      }
      if (ring) {
        ring.style.transform = `translate3d(${boxLeft}px, ${boxTop}px, 0)`;
        ring.style.width = `${boxWidth}px`;
        ring.style.height = `${boxHeight}px`;
        ring.style.opacity = "1";
      }

      if (!tooltip) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tooltipWidth = Math.min(
        Math.max(vw - VIEWPORT_PADDING * 2, 240),
        TOOLTIP_WIDTH
      );
      tooltip.style.width = `${tooltipWidth}px`;
      const tooltipHeight = tooltip.offsetHeight || TOOLTIP_FALLBACK_HEIGHT;

      const spaces = {
        top: rect.top,
        bottom: vh - rect.bottom,
        left: rect.left,
        right: vw - rect.right,
      };

      const isMobile = vw < 640;
      let placement: Placement;
      if (!isMobile) {
        if (spaces.bottom >= tooltipHeight + TOOLTIP_GAP) placement = "bottom";
        else if (spaces.top >= tooltipHeight + TOOLTIP_GAP) placement = "top";
        else if (spaces.right >= tooltipWidth + TOOLTIP_GAP) placement = "right";
        else if (spaces.left >= tooltipWidth + TOOLTIP_GAP) placement = "left";
        else placement = spaces.bottom >= spaces.top ? "bottom" : "top";
      } else {
        if (spaces.bottom >= tooltipHeight + TOOLTIP_GAP) placement = "bottom";
        else if (spaces.top >= tooltipHeight + TOOLTIP_GAP) placement = "top";
        else placement = spaces.bottom >= spaces.top ? "bottom" : "top";
      }

      let tTop: number;
      let tLeft: number;
      let arrowOffset = 48;

      if (placement === "bottom") {
        tTop = clamp(
          rect.bottom + TOOLTIP_GAP,
          VIEWPORT_PADDING,
          vh - tooltipHeight - VIEWPORT_PADDING
        );
        tLeft = clamp(
          rect.left + rect.width / 2 - tooltipWidth / 2,
          VIEWPORT_PADDING,
          vw - tooltipWidth - VIEWPORT_PADDING
        );
        arrowOffset = clamp(
          rect.left + rect.width / 2 - tLeft,
          28,
          tooltipWidth - 28
        );
      } else if (placement === "top") {
        tTop = clamp(
          rect.top - tooltipHeight - TOOLTIP_GAP,
          VIEWPORT_PADDING,
          vh - tooltipHeight - VIEWPORT_PADDING
        );
        tLeft = clamp(
          rect.left + rect.width / 2 - tooltipWidth / 2,
          VIEWPORT_PADDING,
          vw - tooltipWidth - VIEWPORT_PADDING
        );
        arrowOffset = clamp(
          rect.left + rect.width / 2 - tLeft,
          28,
          tooltipWidth - 28
        );
      } else if (placement === "right") {
        tTop = clamp(
          rect.top + rect.height / 2 - tooltipHeight / 2,
          VIEWPORT_PADDING,
          vh - tooltipHeight - VIEWPORT_PADDING
        );
        tLeft = clamp(
          rect.right + TOOLTIP_GAP,
          VIEWPORT_PADDING,
          vw - tooltipWidth - VIEWPORT_PADDING
        );
        arrowOffset = clamp(
          rect.top + rect.height / 2 - tTop,
          28,
          tooltipHeight - 28
        );
      } else {
        tTop = clamp(
          rect.top + rect.height / 2 - tooltipHeight / 2,
          VIEWPORT_PADDING,
          vh - tooltipHeight - VIEWPORT_PADDING
        );
        tLeft = clamp(
          rect.left - tooltipWidth - TOOLTIP_GAP,
          VIEWPORT_PADDING,
          vw - tooltipWidth - VIEWPORT_PADDING
        );
        arrowOffset = clamp(
          rect.top + rect.height / 2 - tTop,
          28,
          tooltipHeight - 28
        );
      }

      tooltip.style.transform = `translate3d(${tLeft}px, ${tTop}px, 0)`;
      tooltip.style.opacity = "1";

      if (arrow && arrowInner) {
        arrow.style.display = "block";
        arrow.style.top = "";
        arrow.style.left = "";
        arrow.style.right = "";
        arrow.style.bottom = "";
        arrowInner.style.top = "";
        arrowInner.style.left = "";

        if (placement === "bottom") {
          arrow.className =
            "absolute h-0 w-0 border-x-[12px] border-b-[12px] border-x-transparent border-b-yellow-200";
          arrow.style.top = "-12px";
          arrow.style.left = `${arrowOffset - 12}px`;
          arrowInner.className =
            "absolute h-0 w-0 border-x-[10px] border-b-[10px] border-x-transparent border-b-yellow-50";
          arrowInner.style.left = "-10px";
          arrowInner.style.top = "2px";
        } else if (placement === "top") {
          arrow.className =
            "absolute h-0 w-0 border-x-[12px] border-t-[12px] border-x-transparent border-t-yellow-200";
          arrow.style.bottom = "-12px";
          arrow.style.left = `${arrowOffset - 12}px`;
          arrowInner.className =
            "absolute h-0 w-0 border-x-[10px] border-t-[10px] border-x-transparent border-t-yellow-50";
          arrowInner.style.left = "-10px";
          arrowInner.style.top = "-12px";
        } else if (placement === "right") {
          arrow.className =
            "absolute h-0 w-0 border-y-[12px] border-r-[12px] border-y-transparent border-r-yellow-200";
          arrow.style.left = "-12px";
          arrow.style.top = `${arrowOffset - 12}px`;
          arrowInner.className =
            "absolute h-0 w-0 border-y-[10px] border-r-[10px] border-y-transparent border-r-yellow-50";
          arrowInner.style.left = "2px";
          arrowInner.style.top = "-10px";
        } else {
          arrow.className =
            "absolute h-0 w-0 border-y-[12px] border-l-[12px] border-y-transparent border-l-yellow-200";
          arrow.style.right = "-12px";
          arrow.style.top = `${arrowOffset - 12}px`;
          arrowInner.className =
            "absolute h-0 w-0 border-y-[10px] border-l-[10px] border-y-transparent border-l-yellow-50";
          arrowInner.style.left = "-12px";
          arrowInner.style.top = "-10px";
        }
      }
    };

    const tick = () => {
      if (cancelled) return;

      if (!trackedElement) {
        const found = findVisibleElement(selector!);
        if (found) {
          trackedElement = found;
          if (!scrolledIntoView) {
            scrolledIntoView = true;
            found.scrollIntoView({
              block: "center",
              inline: "nearest",
              behavior: prefersReducedMotion() ? "auto" : "smooth",
            });
          }
        } else {
          retries += 1;
          if (retries >= ELEMENT_RETRY_FRAMES) {
            setTargetMissing(true);
            placeCenteredTooltip();
            return;
          }
        }
      } else if (!trackedElement.isConnected) {
        trackedElement = null;
        retries = 0;
      } else {
        applyLayout();
      }

      rafId = requestAnimationFrame(tick);
    };

    if (!selector) {
      placeCenteredTooltip();
      const onResize = () => placeCenteredTooltip();
      window.addEventListener("resize", onResize);
      return () => {
        cancelled = true;
        window.removeEventListener("resize", onResize);
      };
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [step.selector, step.title]);

  const nextLabel =
    step.nextLabel ?? (isLastStep ? "チュートリアルを完了する 🎉" : "次へ →");
  const interactionHint =
    step.kind === "interaction" && isWaitingInteraction
      ? step.interactionHint ?? "操作が完了すると自動で次へ進みます"
      : null;

  const hideSpotlight = !step.selector || targetMissing;

  return (
    <>
      <div
        ref={backdropRef}
        aria-hidden
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[70] rounded-[24px] bg-transparent",
          "shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]",
          "opacity-0 transition-opacity duration-150"
        )}
        style={{
          display: hideSpotlight ? "none" : "block",
          willChange: "transform, width, height",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[71] rounded-[24px]",
          "ring-4 ring-orange-400 ring-offset-2 ring-offset-transparent",
          "shadow-[0_0_40px_rgba(251,146,60,0.4)]",
          "motion-safe:animate-pulse",
          "opacity-0 transition-opacity duration-150"
        )}
        style={{
          display: hideSpotlight ? "none" : "block",
          willChange: "transform, width, height",
        }}
      />
      {/* Full-page dim layer when there is no spotlight target,
          so the centered tooltip still sits on a dark backdrop. */}
      {hideSpotlight && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[70] bg-slate-900/55"
        />
      )}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={`チュートリアル: ${step.title}`}
        aria-describedby="tutorial-description"
        aria-live="polite"
        aria-atomic="false"
        className={cn(
          "fixed left-0 top-0 z-[90] max-w-sm rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-slate-900",
          "shadow-[0_18px_45px_rgba(15,23,42,0.22)]",
          "opacity-0 transition-opacity duration-150",
          rotateClass
        )}
        style={{ willChange: "transform" }}
      >
        <div className="absolute left-6 top-[-8px] h-4 w-16 -rotate-6 rounded-sm bg-yellow-200/80 shadow-sm" />
        <span ref={arrowRef} aria-hidden style={{ display: "none" }}>
          <span ref={arrowInnerRef} aria-hidden />
        </span>

        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
              {TUTORIAL_PAGE_LABELS[pageId]}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {currentStepNumber} / {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {Array.from({ length: totalSteps }, (_, i) => {
              const n = i + 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    n < currentStepNumber && "w-2 bg-orange-300",
                    n === currentStepNumber && "w-5 bg-orange-500",
                    n > currentStepNumber && "w-1.5 bg-yellow-200"
                  )}
                />
              );
            })}
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold leading-snug sm:text-lg">
              {step.title}
            </h2>
            <p
              id="tutorial-description"
              className="text-sm leading-6 text-slate-700"
            >
              {step.description}
            </p>
          </div>

          {interactionHint && (
            <div className="rounded-lg border border-orange-300 bg-orange-50/80 px-3 py-2">
              <p className="flex items-center gap-2 text-xs font-semibold text-orange-700">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                  !
                </span>
                {interactionHint}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:bg-yellow-100 hover:text-slate-900 sm:text-xs"
              onClick={onSkip}
            >
              スキップ
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoBack}
              className="border-yellow-300 bg-white/80 hover:bg-white disabled:opacity-30 sm:text-xs"
              onClick={onPrev}
            >
              ← 戻る
            </Button>
            {!interactionHint && (
              <Button
                type="button"
                size="sm"
                className="bg-orange-500 text-white hover:bg-orange-400 sm:text-xs"
                onClick={onNext}
              >
                {nextLabel}
              </Button>
            )}
          </div>

          <p className="text-center text-[10px] text-slate-400">
            {interactionHint
              ? "← で戻る · Esc でスキップ"
              : "← → で移動 · Esc でスキップ"}
          </p>
        </div>
      </div>
    </>
  );
}
