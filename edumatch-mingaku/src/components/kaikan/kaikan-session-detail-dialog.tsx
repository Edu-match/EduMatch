"use client";

import { MapPin, Clock, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SessionDetail = {
  title: string;
  description: string;
  location: string;
  speaker: string;
  startsAt: string | null;
  endsAt: string | null;
};

function fmt(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

/** セッションの全文説明を表示するモーダル。両ビュー（タイムテーブル/一覧）から共有利用。 */
export function KaikanSessionDetailDialog({
  session,
  open,
  onOpenChange,
}: {
  session: SessionDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const start = fmt(session?.startsAt ?? null);
  const end = fmt(session?.endsAt ?? null);
  const timeRange = start ? (end ? `${start}〜${end}` : start) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left leading-snug">
            {session?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {timeRange && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeRange}
              </span>
            )}
            {session?.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {session.location}
              </span>
            )}
            {session?.speaker && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {session.speaker}
              </span>
            )}
          </div>
          {session?.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {session.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">説明はありません。</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
