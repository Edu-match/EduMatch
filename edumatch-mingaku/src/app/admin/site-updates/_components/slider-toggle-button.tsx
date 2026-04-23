"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Monitor, MonitorOff, Loader2 } from "lucide-react";
import { toggleSiteUpdateSlider } from "@/app/_actions/site-updates";

type Props = {
  id: string;
  showInSlider: boolean;
};

export function SliderToggleButton({ id, showInSlider }: Props) {
  const [enabled, setEnabled] = useState(showInSlider);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !enabled;
    startTransition(async () => {
      const result = await toggleSiteUpdateSlider(id, next);
      if (result.success) {
        setEnabled(next);
        toast.success(next ? "スライダーに表示するよう設定しました" : "スライダーから非表示にしました");
      } else {
        toast.error(result.error ?? "更新に失敗しました");
      }
    });
  };

  return (
    <Button
      variant={enabled ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className="min-w-[120px]"
      title={enabled ? "スライダーに表示中（クリックで非表示）" : "スライダーに非表示（クリックで表示）"}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
      ) : enabled ? (
        <Monitor className="h-4 w-4 mr-1.5" />
      ) : (
        <MonitorOff className="h-4 w-4 mr-1.5" />
      )}
      {enabled ? "スライダー表示中" : "スライダー非表示"}
    </Button>
  );
}
