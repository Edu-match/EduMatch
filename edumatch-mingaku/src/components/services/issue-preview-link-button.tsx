"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { issueServicePreviewLink } from "@/app/_actions/services";

/**
 * 「プレビューリンクを発行」ボタン（サービス投稿・編集ページの右上用）。
 * 発行すると公開前のサービスを企業に共有できるURLが有効になり、クリップボードへコピーされる。
 * serviceId が無い（未保存の新規投稿）場合は無効表示。
 */
export function IssuePreviewLinkButton({ serviceId }: { serviceId?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(false);

  const handleIssue = async () => {
    if (!serviceId || busy) return;
    setBusy(true);
    try {
      const result = await issueServicePreviewLink(serviceId);
      if (!result.success || !result.url) {
        toast.error(result.error || "プレビューリンクの発行に失敗しました");
        return;
      }
      try {
        await navigator.clipboard.writeText(result.url);
        toast.success("プレビューリンクを発行し、コピーしました", {
          description: "公開前のページを企業に共有できます",
        });
      } catch {
        window.prompt("以下のURLをコピーしてください", result.url);
      }
      setIssued(true);
    } finally {
      setBusy(false);
    }
  };

  if (!serviceId) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        title="下書き保存後に発行できます"
      >
        <LinkIcon className="mr-1 h-4 w-4" />
        プレビューリンクを発行
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleIssue}
      disabled={busy}
      className="pointer-coarse:min-h-11"
    >
      {busy ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : issued ? (
        <Check className="mr-1 h-4 w-4 text-emerald-600" />
      ) : (
        <LinkIcon className="mr-1 h-4 w-4" />
      )}
      {issued ? "コピーしました（再コピー可）" : "プレビューリンクを発行"}
    </Button>
  );
}
