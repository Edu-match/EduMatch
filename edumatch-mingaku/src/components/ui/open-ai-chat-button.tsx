"use client";

import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  children?: React.ReactNode;
  initialMessage?: string;
  preferredMode?: "navigator" | "debate" | "discussion";
};

/** 押すと画面右下のAIナビゲーター（チャット）を開くボタン */
export function OpenAiChatButton({
  className,
  variant = "outline",
  children,
  initialMessage,
  preferredMode,
}: Props) {
  const openChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-ai-chat", {
          detail: {
            initialMessage,
            preferredMode,
          },
        })
      );
    }
  };
  return (
    <Button variant={variant} className={className} onClick={openChat}>
      {children ?? "AIチャットを開く"}
    </Button>
  );
}
