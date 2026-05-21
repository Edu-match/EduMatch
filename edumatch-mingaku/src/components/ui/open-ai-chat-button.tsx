"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AI_KENTEI_CHAT_BLOCKED_MESSAGE } from "@/lib/ai-kentei-exam-guard";
import { useAiKenteiExamBlocksChat } from "@/hooks/use-ai-kentei-exam-blocks-chat";

type Props = {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  children?: React.ReactNode;
  initialMessage?: string;
  preferredMode?: "navigator" | "debate" | "discussion";
  launchContext?: "default" | "forum-compose";
  forumTopic?: string;
};

/** 押すと画面右下のAIナビゲーター（チャット）を開くボタン */
export function OpenAiChatButton({
  className,
  variant = "outline",
  children,
  initialMessage,
  preferredMode,
  launchContext = "default",
  forumTopic,
}: Props) {
  const examBlocksChat = useAiKenteiExamBlocksChat();

  const openChat = () => {
    if (examBlocksChat) {
      toast.error(AI_KENTEI_CHAT_BLOCKED_MESSAGE);
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-ai-chat", {
          detail: { initialMessage, preferredMode, launchContext, forumTopic },
        })
      );
    }
  };
  return (
    <Button
      variant={variant}
      className={className}
      onClick={openChat}
      disabled={examBlocksChat}
      title={examBlocksChat ? AI_KENTEI_CHAT_BLOCKED_MESSAGE : undefined}
    >
      {children ?? "AIチャットを開く"}
    </Button>
  );
}
