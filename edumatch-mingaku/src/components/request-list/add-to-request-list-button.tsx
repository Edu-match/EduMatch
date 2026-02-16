"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useRequestList } from "./request-list-context";
import type { RequestListItem } from "@/lib/request-list";
import { toast } from "sonner";
import {
  incrementServiceRequestCount,
  decrementServiceRequestCount,
} from "@/app/_actions/popularity";
import { getCurrentSubscription } from "@/app/_actions/subscription";
import { PLANS } from "@/lib/stripe";

type Props = {
  item: RequestListItem;
  variant?: "icon" | "button";
  size?: "sm" | "default" | "lg";
  className?: string;
};

export function AddToRequestListButton({
  item,
  variant = "icon",
  size = "sm",
  className,
}: Props) {
  const { has, toggle, count, isAuthenticated } = useRequestList();
  const inList = has(item.id);
  const [requestListLimit, setRequestListLimit] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated !== true) return;
    const loadLimit = async () => {
      try {
        const subscription = await getCurrentSubscription();
        const planId = subscription?.plan || "FREE";
        const plan = PLANS[planId as keyof typeof PLANS] || PLANS.FREE;
        setRequestListLimit(plan.requestListLimit || 2);
      } catch (error) {
        console.error("Failed to get subscription:", error);
        setRequestListLimit(2);
      }
    };
    loadLimit();
  }, [isAuthenticated]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 認証チェック
    if (isAuthenticated === null) {
      toast.error("読み込み中です。もう一度お試しください。");
      return;
    }

    if (!isAuthenticated) {
      toast.error("この機能を使うにはログインが必要です");
      setTimeout(() => {
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect_to=${encodeURIComponent(currentPath)}&message=${encodeURIComponent("資料請求リストを利用するにはログインが必要です")}`;
      }, 1000);
      return;
    }

    // 制限チェック（追加時のみ）
    if (!inList && requestListLimit !== null && count >= requestListLimit) {
      const plan = requestListLimit === 2 ? "フリー" : requestListLimit === 5 ? "スタンダード" : "プレミアム";
      toast.error(`資料請求リストの上限（${requestListLimit}件）に達しています。プランをアップグレードしてください。`, {
        duration: 5000,
        action: {
          label: "プランを見る",
          onClick: () => {
            window.location.href = "/plans";
          },
        },
      });
      return;
    }

    const added = toggle(item);

    // サーバー側でカウントを更新
    try {
      if (added) {
        await incrementServiceRequestCount(item.id);
      } else {
        await decrementServiceRequestCount(item.id);
      }
    } catch (error) {
      console.error("Failed to update request count:", error);
    }

    toast.success(
      added
        ? "資料請求リストに追加しました"
        : "資料請求リストから外しました"
    );
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`rounded-full ${className ?? ""}`}
        onClick={handleClick}
        aria-label={inList ? "資料請求リストから外す" : "資料請求リストに追加"}
        title={inList ? "資料請求リストから外す" : "後でまとめて資料請求に追加"}
      >
        {inList ? (
          <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
        ) : (
          <Bookmark className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={inList ? "secondary" : "outline"}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {inList ? (
        <>
          <BookmarkCheck className="h-4 w-4 mr-2 fill-primary text-primary" />
          リストに追加済み
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 mr-2" />
          後で資料請求に追加
        </>
      )}
    </Button>
  );
}
