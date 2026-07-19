"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock, User, Check, Plus, CheckCircle2, AlertTriangle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SessionDetail = {
  id: string;
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

/** セッションの全文説明＋選択（カート追加）操作を行うモーダル。両ビュー（タイムテーブル/一覧）から共有利用。 */
export function KaikanSessionDetailDialog({
  session,
  open,
  onOpenChange,
  selected = false,
  applied = false,
  full = false,
  conflicting = false,
  onToggleSelect,
}: {
  session: SessionDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 選択状態などのフラグは親（KaikanViewToggle）から都度供給。 */
  selected?: boolean;
  applied?: boolean;
  full?: boolean;
  conflicting?: boolean;
  onToggleSelect?: (session: SessionDetail) => void;
}) {
  const start = fmt(session?.startsAt ?? null);
  const end = fmt(session?.endsAt ?? null);
  const timeRange = start ? (end ? `${start}〜${end}` : start) : "";

  // カート追加アニメーション用の一時状態（追加操作時のみ短時間 true）。
  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 900);
    return () => clearTimeout(t);
  }, [justAdded]);
  // ダイアログを開き直すたびにアニメーション状態はリセット。
  useEffect(() => {
    if (!open) setJustAdded(false);
  }, [open]);

  const handleToggle = () => {
    if (!session || !onToggleSelect) return;
    if (applied || full || (conflicting && !selected)) return;
    const wasSelected = selected;
    if (!wasSelected) setJustAdded(true);
    onToggleSelect(session);
    // 押したら自動でポップアップを閉じる（選択時はアニメを一瞬見せてから）。
    setTimeout(() => onOpenChange(false), wasSelected ? 150 : 600);
  };

  // 選択ボタンの状態を props から都度算出（ライブ反映）。
  const actionDisabled = applied || full || (conflicting && !selected);

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

          {/* 時間重複の注意書き（未選択かつ重複時のみ） */}
          {conflicting && !selected && !applied && !full && (
            <p className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              他の予定と時間が重複しています
            </p>
          )}
        </div>

        {/* アクション行：戻る + 選択/取り消し */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="lg">
              <ChevronLeft className="h-4 w-4" />
              戻る
            </Button>
          </DialogClose>

          {applied ? (
            <Button type="button" size="lg" disabled className="min-w-[9rem]">
              <CheckCircle2 className="h-4 w-4" />
              申込済み
            </Button>
          ) : full ? (
            <Button type="button" size="lg" disabled variant="secondary" className="min-w-[9rem]">
              満席
            </Button>
          ) : conflicting && !selected ? (
            <Button type="button" size="lg" disabled variant="secondary" className="min-w-[9rem]">
              追加できません
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={handleToggle}
              disabled={actionDisabled}
              variant={selected ? "outline" : "default"}
              aria-pressed={selected}
              className={`min-w-[9rem] transition-transform ${justAdded ? "animate-cart-pop" : ""} ${
                selected ? "border-primary text-primary" : ""
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  選択しました
                </>
              ) : selected ? (
                <>
                  <Check className="h-4 w-4" />
                  選択中（タップで取り消し）
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  このプログラムを選択する
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
