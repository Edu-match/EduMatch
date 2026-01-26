"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "m1",
      role: "assistant",
      text: "こんにちは！Edumatch AI（デモ）です。何をお手伝いできますか？",
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  const placeholderReplies = useMemo(
    () => [
      "ありがとうございます。デモのため、回答は簡易表示です。",
      "なるほど。もう少し詳しく教えてください。",
      "その内容なら、まずは「サービス一覧」から探すのがおすすめです。",
      "記事投稿（デモ）も用意しています。必要なら案内します。",
    ],
    []
  );

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, messages.length]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setText("");

    const reply =
      placeholderReplies[Math.floor(Math.random() * placeholderReplies.length)];
    const botMsg: ChatMsg = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: reply,
    };
    setTimeout(() => {
      setMessages((prev) => [...prev, botMsg]);
    }, 250);
  }

  return (
    <div className="fixed bottom-4 right-4 sm:right-4 z-50">
      {open ? (
        <div className="w-[calc(100vw-2rem)] sm:w-[380px] max-w-[400px] h-[calc(100vh-6rem)] sm:h-[500px] max-h-[600px] overflow-hidden rounded-xl border bg-background shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm font-semibold">AIチャット（デモ）</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 text-sm"
          >
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t p-3 flex-shrink-0">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="メッセージを入力…"
                className="flex-1"
              />
              <Button type="submit" size="icon" aria-label="送信">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
          aria-label="AIチャットを開く"
          size="icon"
        >
          <Bot className="h-6 w-6 text-primary-foreground" />
        </Button>
      )}
    </div>
  );
}
