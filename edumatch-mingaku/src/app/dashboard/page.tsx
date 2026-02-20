import { FEATURES } from "@/lib/features";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  FileBadge2,
  Star,
  Settings,
  ArrowRight,
  Eye,
  Heart,
  CreditCard,
} from "lucide-react";
import { requireAuth, getCurrentProfile } from "@/lib/auth";
import { getRecentViewHistory } from "@/app/_actions";
import { RequestListCompact } from "@/components/dashboard/request-list-compact";
import { FavoritesCompact } from "@/components/dashboard/favorites-compact";
import { MyReviewsCompact } from "@/components/dashboard/my-reviews-compact";
import {
  getPopularServicesByEngagement,
  getPopularArticlesByEngagement,
} from "@/app/_actions/popularity";
import { getCurrentSubscription } from "@/app/_actions/subscription";
import { getMyReviews } from "@/app/_actions/reviews";

// 閲覧時刻を「ついさっき」「〇分前」などで表示
function formatViewedAt(viewedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - viewedAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  if (diffSec < 60) return "ついさっき";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  return viewedAt.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "ユーザー";

  // 全ユーザー共通のマイページを表示
  const recentlyViewed = await getRecentViewHistory(user.id, 5);
  const myReviews = await getMyReviews();

  const subscription = await getCurrentSubscription();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">マイページ</h1>
            <p className="text-muted-foreground">
              こんにちは、{displayName}さん
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/profile/register">
              <Settings className="h-4 w-4 mr-2" />
              プロフィール設定
            </Link>
          </Button>
        </div>
      </div>

      <div className={FEATURES.PAID_PLANS ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-6"}>
        {/* メインコンテンツ */}
        <div className={FEATURES.PAID_PLANS ? "lg:col-span-2 space-y-6" : "space-y-6"}>
          {/* 閲覧履歴 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                最近の閲覧履歴
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/history">
                  すべて見る
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentlyViewed.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">まだ閲覧履歴はありません。記事やサービスを見るとここに表示されます。</p>
                ) : (
                  recentlyViewed.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.type === "service" ? `/services/${item.id}` : `/articles/${item.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="relative w-20 flex-shrink-0 overflow-hidden rounded bg-muted aspect-video">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                          {item.type === "service" ? "S" : "A"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.type === "service" ? "サービス" : "記事"}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatViewedAt(item.viewedAt)}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* サービスのお気に入り（最大5件まで一斉に資料請求可能） */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileBadge2 className="h-5 w-5" />
                サービスのお気に入り
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/request-info/list">
                  すべて見る
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <RequestListCompact maxBatchRequest={5} />
            </CardContent>
          </Card>

          {/* 記事のお気に入り */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                記事のお気に入り
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/favorites">
                  すべて見る
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <FavoritesCompact articleOnly />
            </CardContent>
          </Card>

          {/* 自分の口コミ（確認・削除のみ） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                自分の口コミ
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                投稿した口コミの確認・削除ができます（編集はできません）
              </p>
            </CardHeader>
            <CardContent>
              <MyReviewsCompact reviews={myReviews} />
            </CardContent>
          </Card>
        </div>

        {/* サイドバー（プラン情報のみ・FEATURES.PAID_PLANS が true の場合のみ表示） */}
        {FEATURES.PAID_PLANS && (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  ご利用プラン
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <Badge
                    className={
                      subscription?.isActive
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : ""
                    }
                  >
                    {subscription?.planName || "フリー"}プラン
                  </Badge>
                  {subscription?.isActive && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      有効
                    </Badge>
                  )}
                  {subscription?.isCanceled && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      キャンセル予定
                    </Badge>
                  )}
                </div>
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {subscription.isCanceled ? "利用可能期限" : "次回請求日"}:{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("ja-JP")}
                  </p>
                )}
                {(!subscription || subscription.plan === "FREE" || !subscription.isActive) ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      アップグレードすると、すべての機能が利用できます。
                    </p>
                    <Button className="w-full" asChild>
                      <Link href="/plans">プランを見る</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      プランの変更・キャンセルは管理ページから行えます。
                    </p>
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/dashboard/subscription">
                        サブスクリプション管理
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
        </div>
        )}
      </div>
    </div>
  );
}
