"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ArrowLeft,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";

const PLAN_DETAILS: Record<string, { name: string; price: number; period: string }> = {
  STANDARD: { name: "スタンダード", price: 29800, period: "月額" },
  PREMIUM: { name: "プレミアム", price: 50000, period: "月額" },
};

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") || "STANDARD";
  const selectedPlan = PLAN_DETAILS[planId] || PLAN_DETAILS.STANDARD;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }

      if (data.url) {
        router.push(data.url);
      }
    } catch {
      setError("決済処理中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/plans">
          <ArrowLeft className="h-4 w-4 mr-2" />
          プラン選択に戻る
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">お支払い</h1>
          <p className="text-muted-foreground">
            Stripeの安全な決済システムでお支払いいただけます
          </p>
        </div>

        {/* 選択中のプラン */}
        <Card>
          <CardHeader>
            <CardTitle>選択中のプラン</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">{selectedPlan.name}プラン</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.period}
                </p>
              </div>
              <Badge variant="default">選択中</Badge>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">小計</span>
                <span>¥{selectedPlan.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">消費税（10%）</span>
                <span>
                  ¥{Math.floor(selectedPlan.price * 0.1).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>合計（税込）</span>
                <span>
                  ¥{Math.floor(selectedPlan.price * 1.1).toLocaleString()}/月
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Checkout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              お支払い方法
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              「お支払いに進む」をクリックすると、Stripeの安全な決済ページに移動します。
              クレジットカード情報はStripeにより安全に処理されます。
            </p>

            <div className="flex items-center gap-2 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                VISA, Mastercard, JCB, American Expressに対応。すべての決済情報はSSLで暗号化されます。
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  お支払いに進む（Stripe）
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                「お支払いに進む」をクリックすると、
                <Link href="/terms" className="text-primary hover:underline">
                  利用規約
                </Link>
                に同意したものとみなされます。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 安心保証 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <span className="font-medium">安心の保証</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                いつでもキャンセル可能
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                14日間の返金保証
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                セキュアな決済処理（Stripe）
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">読み込み中...</p>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
