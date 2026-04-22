"use client";

import { useEffect, useRef } from "react";
import { useAiPanel } from "@/components/layout/ai-panel-context";

interface ArticleScrollSentinelProps {
  articleId: string;
  articleTitle: string;
}

/**
 * 記事の末尾に配置するセンチネル要素。
 * ユーザーが記事を最後までスクロールしたとき、AIパネルを自動アクティブ化する。
 */
export function ArticleScrollSentinel({ articleId, articleTitle }: ArticleScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const firedRef = useRef(false);
  const { triggerArticleComplete } = useAiPanel();

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !firedRef.current) {
            firedRef.current = true;
            triggerArticleComplete(articleId, articleTitle);
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [articleId, articleTitle, triggerArticleComplete]);

  return <div ref={sentinelRef} aria-hidden className="h-px" />;
}
