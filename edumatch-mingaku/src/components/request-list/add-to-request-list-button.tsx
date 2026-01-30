"use client";

import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useRequestList } from "./request-list-context";
import type { RequestListItem } from "@/lib/request-list";
import { toast } from "sonner";

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
  const { has, toggle } = useRequestList();
  const inList = has(item.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(item);
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
