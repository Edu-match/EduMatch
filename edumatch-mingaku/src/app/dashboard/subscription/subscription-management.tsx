"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  Check,
  ArrowRight,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type { SubscriptionInfo } from "@/app/_actions/subscription";

type PlanDef = {
  id: string;
  name: string;
  price: number;
  priceId: string | null;
  description: string;
  features: string[];
};

type Props = {
  subscription: SubscriptionInfo;
  plans: Record<string, PlanDef>;
};

export function SubscriptionManagement({ subscription, plans }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentPlan = subscription.plan
    ? plans[subscription.plan] || plans.FREE
    : plans.FREE;

  const handleCancel = async () => {
    setIsLoading(true);
    setActionType("cancel");
    setError(null);

    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "キャンセルに失敗しました");
        return;
      }

      setShowCancelConfirm(false);
      router.refresh();
    } catch {
      setError("処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    setActionType("resume");
    setError(null);

    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "再開に失敗しました");
        return;
      }

      router.refresh();
    } catch {
      setError("処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setIsLoading(true);
    setActionType(planId);
    setError(null);

    try {
      // 既存のサブスクリプションがある場合はプラン変更
      if (subscription.stripeSubscriptionId) {
        const response = await fetch("/api/stripe/subscription", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "プラン変更に失敗しました");
          return;
        }

        router.refresh();
      } else {
        // 新規サブスクリプション
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
      }
    } catch {
      setError("処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const statusBadge = () => {
    switch (subscription.status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">有効</Badge>;
      case "CANCELED":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">キャンセル予定</Badge>;
      case "PAST_DUE":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">支払い遅延</Badge>;
      default:
        return <Badge variant="secondary">未契約</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 現在のプラン */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            現在のプラン
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{currentPlan.name}プラン</h3>
              <p className="text-muted-foreground">{currentPlan.description}</p>
            </div>
            <div className="text-right">
              {statusBadge()}
              <p className="text-2xl font-bold mt-2">
                ¥{currentPlan.price.toLocaleString()}
                {currentPlan.price > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /月
                  </span>
                )}
              </p>
            </div>
          </div>

          {subscription.currentPeriodEnd && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {subscription.isCanceled
                  ? "利用可能期限: "
                  : "次回請求日: "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  "ja-JP",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </span>
            </div>
          )}

          {subscription.status === "PAST_DUE" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                お支払いに問題があります。カード情報をご確認ください。
              </span>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-2">
            {subscription.isActive && (
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
            )}

            {subscription.isCanceled && subscription.stripeSubscriptionId && (
              <Button
                variant="outline"
                onClick={handleResume}
                disabled={isLoading && actionType === "resume"}
              >
                {isLoading && actionType === "resume" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                サブスクリプションを再開
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* キャンセル確認ダイアログ */}
      {showCancelConfirm && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-bold text-red-800">
                サブスクリプションをキャンセルしますか？
              </h3>
            </div>
            <p className="text-sm text-red-700 mb-4">
              キャンセルしても、現在の請求期間が終了するまで引き続きサービスをご利用いただけます。
              キャンセル後はフリープランに戻ります。
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isLoading && actionType === "cancel"}
              >
                {isLoading && actionType === "cancel" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                キャンセルを確定
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isLoading}
              >
                戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* プラン変更 */}
      <Card>
        <CardHeader>
          <CardTitle>プランを変更</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(plans).map((plan) => {
              const isCurrent = plan.id === (subscription.plan || "FREE");

              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    isCurrent
                      ? "border-2 border-primary"
                      : "border hover:border-muted-foreground/30"
                  }`}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      現在のプラン
                    </Badge>
                  )}
                  <CardContent className="p-4">
                    <h4 className="font-bold text-lg mb-1">{plan.name}</h4>
                    <p className="text-2xl font-bold mb-2">
                      ¥{plan.price.toLocaleString()}
                      {plan.price > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /月
                        </span>
                      )}
                    </p>
                    <ul className="space-y-1 mb-4">
                      {plan.features.slice(0, 4).map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-xs text-muted-foreground">
                          他 {plan.features.length - 4} 件の機能
                        </li>
                      )}
                    </ul>

                    {isCurrent ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                        size="sm"
                      >
                        現在のプラン
                      </Button>
                    ) : plan.id === "FREE" ? (
                      subscription.isActive || subscription.isCanceled ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={() => setShowCancelConfirm(true)}
                        >
                          ダウングレード
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                          size="sm"
                        >
                          現在のプラン
                        </Button>
                      )
                    ) : (
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isLoading && actionType === plan.id}
                      >
                        {isLoading && actionType === plan.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        {subscription.isActive ? "変更する" : "選択する"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ヘルプ */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            プランやお支払いについてご不明な点がございましたら、
            <Link
              href="/contact"
              className="text-primary hover:underline"
            >
              お問い合わせページ
            </Link>
            からお気軽にご連絡ください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
