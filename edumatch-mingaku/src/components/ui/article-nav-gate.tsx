"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAiPanel } from "@/components/layout/ai-panel-context";
import { MessageSquare, ArrowRight, SkipForward } from "lucide-react";

interface RelatedArticle {
  id: string;
  title: string;
  href: string;
}

interface ArticleNavGateProps {
  currentArticleTitle: string;
  children: React.ReactNode;
  /** クリックをインターセプトするリンクの記事一覧 */
  articles: RelatedArticle[];
}

/**
 * 関連記事への遷移をインターセプトし、1問回答を促すゲートダイアログを表示する。
 */
export function ArticleNavGate({ currentArticleTitle, articles, children }: ArticleNavGateProps) {
  const router = useRouter();
  const { setOpen, setMobileOpen } = useAiPanel();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const handleAnswerFirst = useCallback(() => {
    setOpen(true);
    setMobileOpen(true);
    setPendingHref(null);
  }, [setOpen, setMobileOpen]);

  const handleSkip = useCallback(() => {
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  }, [pendingHref, router]);

  const handleCancel = useCallback(() => {
    setPendingHref(null);
  }, []);

  return (
    <>
      {/* Gate dialog overlay */}
      {pendingHref && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
            aria-hidden
          />
          <div className="relative bg-background rounded-2xl shadow-2xl border p-6 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">ちょっと待って！</p>
                <p className="text-xs text-muted-foreground mt-0.5">次へ進む前に1問だけ</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              「{currentArticleTitle}」についてAIと話してみませんか？
              読んだ感想や疑問を1問だけ答えると、理解が深まります。
            </p>

            <div className="space-y-2">
              <Button
                className="w-full gap-2"
                onClick={handleAnswerFirst}
              >
                <MessageSquare className="h-4 w-4" />
                AIに1問答えてから次へ
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-muted-foreground"
                onClick={handleSkip}
              >
                <SkipForward className="h-4 w-4" />
                スキップして次へ
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="キャンセル"
            >
              <span className="text-xs">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Render children with intercepted links */}
      <div
        onClick={(e) => {
          const anchor = (e.target as HTMLElement).closest("a");
          if (!anchor) return;
          const href = anchor.getAttribute("href");
          if (!href) return;
          const isRelatedArticle = articles.some(
            (a) => href === a.href || href.endsWith(a.id)
          );
          if (isRelatedArticle) {
            e.preventDefault();
            setPendingHref(href);
          }
        }}
      >
        {children}
      </div>
    </>
  );
}
