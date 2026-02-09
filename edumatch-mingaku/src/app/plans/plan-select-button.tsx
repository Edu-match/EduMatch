"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  planId: string;
  planName: string;
  hasSubscription: boolean;
  popular: boolean;
};

export function PlanSelectButton({
  planId,
  planName,
  hasSubscription,
  popular,
}: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      if (hasSubscription) {
        // 既存サブスクリプションがある場合はプラン変更
        const response = await fetch("/api/stripe/subscription", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });

        if (response.ok) {
          router.refresh();
          router.push("/dashboard/subscription");
        }
      } else {
        // 新規の場合はCheckout
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });

        const data = await response.json();

        if (data.url) {
          router.push(data.url);
        }
      }
    } catch (error) {
      console.error("Plan selection error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full"
      variant={popular ? "default" : "outline"}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          処理中...
        </>
      ) : hasSubscription ? (
        `${planName}に変更`
      ) : (
        `${planName}を選択`
      )}
    </Button>
  );
}
