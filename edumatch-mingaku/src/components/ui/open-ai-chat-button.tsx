"use client";

import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  children?: React.ReactNode;
};

/** 押すと画面右下のAIナビゲーター（チャット）を開くボタン */
export function OpenAiChatButton({ className, variant = "outline", children }: Props) {
  const openChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-ai-chat"));
    }
  };
  return (
    <Button variant={variant} className={className} onClick={openChat}>
      {children ?? "AIチャットを開く"}
    </Button>
  );
}
