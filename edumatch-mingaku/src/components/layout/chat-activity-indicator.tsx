"use client";

import { useEffect, useRef } from "react";
import { Check, Loader2, Minus, ChevronDown, ChevronUp } from "lucide-react";
import type { ChatActivityPhase } from "@/lib/ai-chat-stream";

export type ChatActivityStep = {
  id: string;
  phase: ChatActivityPhase;
  message: string;
  submessage?: string;
  status: "active" | "done" | "skipped";
};

type Props = {
  steps: ChatActivityStep[];
  isStreaming: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

const COLLAPSED_PREVIEW = 3;

/** フェーズごとのアイコン/カラーヒント */
function phaseColor(phase: ChatActivityPhase, status: ChatActivityStep["status"]): string {
  if (status === "skipped") return "text-muted-foreground/50";
  if (status === "done") return "text-muted-foreground";
  // active
  switch (phase) {
    case "analyze":
    case "site_search":
    case "site_item":
    case "site_done":
    case "keyword_fallback":
      return "text-emerald-600 dark:text-emerald-400";
    case "rag_search":
    case "rag_item":
    case "rag_done":
      return "text-indigo-600 dark:text-indigo-400";
    case "web_search":
    case "web_searching":
    case "web_sources":
      return "text-amber-600 dark:text-amber-400";
    case "prepare":
    case "generating":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

function dotBg(phase: ChatActivityPhase, status: ChatActivityStep["status"]): string {
  if (status === "skipped") return "bg-muted border border-muted-foreground/20";
  if (status === "done") return "bg-muted border border-muted-foreground/20";
  switch (phase) {
    case "site_search":
    case "site_item":
    case "site_done":
    case "keyword_fallback":
      return "bg-emerald-100 border border-emerald-400 dark:bg-emerald-900/40 dark:border-emerald-500";
    case "rag_search":
    case "rag_item":
    case "rag_done":
      return "bg-indigo-100 border border-indigo-400 dark:bg-indigo-900/40 dark:border-indigo-500";
    case "web_search":
    case "web_searching":
    case "web_sources":
      return "bg-amber-100 border border-amber-400 dark:bg-amber-900/40 dark:border-amber-500";
    case "prepare":
    case "generating":
      return "bg-primary/10 border border-primary/40";
    default:
      return "bg-muted border border-border";
  }
}

function StepIcon({ step }: { step: ChatActivityStep }) {
  if (step.status === "active") {
    return <Loader2 className="h-2.5 w-2.5 animate-spin" />;
  }
  if (step.status === "skipped") {
    return <Minus className="h-2.5 w-2.5" />;
  }
  return <Check className="h-2.5 w-2.5" />;
}

export function ChatActivityIndicator({ steps, isStreaming, isExpanded, onToggle }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // ストリーミング中は最下部へ自動スクロール
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length, isStreaming]);

  if (steps.length === 0) return null;

  const showAll = isStreaming || isExpanded;
  const visibleSteps = showAll ? steps : steps.slice(0, COLLAPSED_PREVIEW);
  const hasMore = !isStreaming && steps.length > COLLAPSED_PREVIEW;

  return (
    <div className="mb-3">
      {/* タイムライン本体 */}
      <div
        ref={scrollRef}
        className={`relative pl-5 ${
          isStreaming
            ? "max-h-[300px] overflow-y-auto"
            : showAll
              ? "max-h-[260px] overflow-y-auto"
              : ""
        }`}
      >
        {/* 縦線 */}
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60"
          aria-hidden
        />

        {visibleSteps.map((step) => {
          const isActive = step.status === "active";
          const colorClass = phaseColor(step.phase, step.status);
          const dotClass = dotBg(step.phase, step.status);

          return (
            <div
              key={step.id}
              className={`flex items-start gap-2.5 py-[3px] rounded-sm transition-colors ${
                isActive
                  ? "bg-primary/[0.04] -ml-1 pl-1 border-l-2 border-primary/30"
                  : ""
              }`}
            >
              {/* ドット + アイコン */}
              <div
                className={`relative z-10 mt-[3px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full ${dotClass} ${colorClass}`}
              >
                <StepIcon step={step} />
              </div>

              {/* テキスト */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[12px] leading-snug ${
                    isActive
                      ? `font-medium ${colorClass}`
                      : step.status === "skipped"
                        ? "text-muted-foreground/50 line-through"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.message}
                </p>
                {step.submessage && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {step.submessage}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 折りたたみトグル（完了後のみ） */}
      {hasMore && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 ml-5 flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              折りたたむ
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              詳細を表示（全 {steps.length} 件）
            </>
          )}
        </button>
      )}
    </div>
  );
}
