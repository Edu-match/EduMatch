"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  USER_REPORT_REASON_CODES,
  USER_REPORT_REASON_LABELS,
  type UserReportReasonCode,
} from "@/lib/user-report-reasons";

type Props = {
  targetType: "post" | "reply";
  targetId: string;
};

export function ReportForumContentButton({ targetType, targetId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<UserReportReasonCode>("HARASSMENT");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType,
          targetId,
          reasonCode: reason,
          detail: detail.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "報告に失敗しました。");
        return;
      }
      toast.success("報告を受け付けました。運営が確認します。");
      setOpen(false);
      setReason("HARASSMENT");
      setDetail("");
    } catch {
      toast.error("通信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Flag className="h-3.5 w-3.5" />
        報告
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>この投稿を報告</DialogTitle>
            <DialogDescription>
              不適切な投稿を報告できます。虚偽の通報は利用規約違反となる場合があります。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="report-reason">理由</Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as UserReportReasonCode)}
              >
                <SelectTrigger id="report-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_REPORT_REASON_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {USER_REPORT_REASON_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-detail">補足（任意）</Label>
              <Textarea
                id="report-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="必要なら状況を入力してください（最大4000文字）"
                rows={4}
                maxLength={4000}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              キャンセル
            </Button>
            <Button type="button" onClick={() => void onSubmit()} disabled={sending}>
              {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              報告する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
