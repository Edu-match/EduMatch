"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

type ShareButtonProps = {
  url: string;
  title: string;
  text?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export function ShareButton({
  url,
  title,
  text,
  variant = "outline",
  size = "sm",
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title,
      text: text || title,
      url,
    };

    // Web Share APIが利用可能な場合（モバイルなど）
    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("共有しました");
      } catch (error) {
        // ユーザーがキャンセルした場合など
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
          fallbackCopy();
        }
      }
    } else {
      // Web Share APIが使えない場合はクリップボードにコピー
      fallbackCopy();
    }
  };

  const fallbackCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URLをクリップボードにコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // フォールバック: テキストエリアを使用
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast.success("URLをクリップボードにコピーしました");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error("URLのコピーに失敗しました");
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          コピーしました
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 mr-2" />
          共有
        </>
      )}
    </Button>
  );
}
