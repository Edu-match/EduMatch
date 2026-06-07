"use client";

import { cn } from "@/lib/utils";

/** コミュニティルーム作成時に選べる絵文字 */
export const FORUM_ROOM_EMOJI_OPTIONS = [
  "💬", "📚", "🎓", "✏️", "💡", "🤝", "🏫", "📖",
  "🎯", "🔥", "🌱", "🎨", "👥", "💼", "📅", "🎬",
  "📝", "🚀", "❓", "☕", "🌟", "🧑‍🏫", "🗣️", "💭",
] as const;

export function ForumEmojiPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">ルームアイコン</p>
      <div className="flex flex-wrap gap-1.5">
        {FORUM_ROOM_EMOJI_OPTIONS.map((emoji) => {
          const selected = value === emoji;
          return (
            <button
              key={emoji}
              type="button"
              aria-label={`アイコン ${emoji}`}
              aria-pressed={selected}
              onClick={() => onChange(emoji)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors",
                selected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
