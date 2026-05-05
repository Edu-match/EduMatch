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
  type UserReportContextKind,
  type UserReportReasonCode,
} from "@/lib/user-report-reasons";

type Props = {
  reportedUserId: string;
  reportedDisplayName: string;
  contextKind?: UserReportContextKind;
  contextExcerpt?: string | null;
};

export function ReportUserButton({
  reportedUserId,
  reportedDisplayName,
  contextKind = "comment",
  contextExcerpt,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<UserReportReasonCode>("HARASSMENT");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportedUserId,
          reasonCode: reason,
          detail: detail.trim() || null,
          contextKind,
          contextExcerpt: contextExcerpt?.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };
      if (!res.ok) {
        toast.error(data.error ?? "送信に失敗しました。");
        return;
      }
      toast.success("報告を受け付けました。運営が内容を確認します。");
      setOpen(false);
      setDetail("");
      setReason("HARASSMENT");
    } catch {
      toast.error("通信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3.5 w-3.5 mr-1" />
        報告
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ユーザーを報告</DialogTitle>
            <DialogDescription>
              対象: <span className="font-medium text-foreground">{reportedDisplayName}</span>
              <br />
              虚偽の通報は利用規約違反となる場合があります。内容は運営のみが確認します。
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
                placeholder="状況が分かるよう、簡潔にご記入ください（最大4000文字）"
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
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  送信中
                </>
              ) : (
                "報告する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
