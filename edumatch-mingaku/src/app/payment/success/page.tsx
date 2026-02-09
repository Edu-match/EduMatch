import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ArrowRight,
  Home,
  Sparkles,
  Settings,
} from "lucide-react";

function SuccessContent() {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold mb-4">
              お支払いが完了しました！
            </h1>

            <p className="text-lg text-muted-foreground mb-2">
              プランのアップグレードが完了しました。
            </p>
            <p className="text-muted-foreground mb-8">
              すべてのプレミアム機能をご利用いただけます。
            </p>

            {/* 利用開始案内 */}
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">利用可能になった機能</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>会員限定記事が読み放題になりました</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>お気に入り登録が無制限になりました</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>詳細なレポート機能が利用可能になりました</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* お知らせ */}
            <div className="p-4 rounded-lg bg-muted/50 mb-8 text-left">
              <p className="text-sm text-muted-foreground">
                決済確認メールがStripeから送信されます。
                サブスクリプションの管理は「サブスクリプション管理」ページからいつでも行えます。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard">
                  ダッシュボードへ
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/dashboard/subscription">
                  <Settings className="h-4 w-4" />
                  サブスクリプション管理
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  トップページへ
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8 text-center">
          <p>読み込み中...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
