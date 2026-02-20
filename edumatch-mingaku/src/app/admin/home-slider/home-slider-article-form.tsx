"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { addHomeSliderArticle, removeHomeSliderArticle } from "@/app/_actions/home";

export function HomeSliderArticleForm({
  postId,
  action,
}: {
  postId: string;
  action: "add" | "remove";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      if (action === "add") {
        const r = await addHomeSliderArticle(postId);
        if (r.success) router.refresh();
      } else {
        const r = await removeHomeSliderArticle(postId);
        if (r.success) router.refresh();
      }
    });
  };

  if (action === "add") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        aria-label="追加"
      >
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="text-destructive hover:text-destructive"
      aria-label="削除"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
