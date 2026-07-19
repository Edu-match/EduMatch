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
  Heart,
  User,
  ChevronRight,
  Award,
  Ticket,
} from "lucide-react";
import { AiKenteiCertificatesCompact } from "@/components/ai-kentei/certificates-compact";
import { requireAuth, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecentViewHistory } from "@/app/_actions";
import { RequestListCompact } from "@/components/dashboard/request-list-compact";
import { FavoritesCompact } from "@/components/dashboard/favorites-compact";
import { MyReviewsCompact } from "@/components/dashboard/my-reviews-compact";
import { getMyReviews } from "@/app/_actions/reviews";
import { InAppNotificationsCard } from "@/components/dashboard/in-app-notifications-card";
import { FEATURES } from "@/lib/features";

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
    timeZone: "Asia/Tokyo",
  });
}

export default async function MyPage() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "ユーザー";

  const recentlyViewed = await getRecentViewHistory(user.id, 5);
  const myReviews = FEATURES.REVIEWS ? await getMyReviews() : [];

  // 電子チケット（議員会館）：ticket_token でまとめる
  const myApps = await prisma.kaikanApplication.findMany({
    where: { profile_id: user.id, status: { not: "cancelled" } },
    select: { ticket_token: true, qr_token: true, status: true, created_at: true, content: { select: { title: true } } },
    orderBy: { created_at: "desc" },
  }).catch(() => [] as { ticket_token: string | null; qr_token: string; status: string; created_at: Date; content: { title: string } }[]);
  const ticketMap = new Map<string, { token: string; titles: string[]; allChecked: boolean }>();
  for (const a of myApps) {
    const token = a.ticket_token ?? a.qr_token;
    const g = ticketMap.get(token) ?? { token, titles: [], allChecked: true };
    g.titles.push(a.content.title);
    if (a.status !== "checked_in") g.allChecked = false;
    ticketMap.set(token, g);
  }
  const myTickets = [...ticketMap.values()];

  return (
    <div className="container py-8">
      {/* アカウント概要カード：設定への導線を明確に */}
      <Card className="mb-6 overflow-hidden border-2 border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <Link
          href="/profile/register"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-muted border-2 border-background shadow-sm overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <User className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">
                {user.email ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                表示名・アイコン・連絡先を変更できます
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary font-medium shrink-0 sm:pl-4">
            <Settings className="h-5 w-5" aria-hidden />
            <span>アカウント設定</span>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" aria-hidden />
          </div>
        </Link>
      </Card>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">マイページ</h1>
        <p className="text-muted-foreground">
          こんにちは、{displayName}さん
        </p>
      </div>

      {/* 電子チケット（議員会館イベント）: 常に表示。未取得時は導線を出す。 */}
      <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> 電子チケット</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/summit2026">コンテンツを探す<ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            {myTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-center">
                <p className="text-sm text-muted-foreground">まだ電子チケットはありません。</p>
                <Button size="sm" asChild className="mt-3"><Link href="/summit2026">教育AIサミット2026に申し込む<ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              </div>
            ) : (
            <ul className="space-y-2">
              {myTickets.map((t) => (
                <li key={t.token}>
                  <Link href={`/summit2026/ticket/${t.token}`} className="group flex min-h-[44px] items-center justify-between gap-3 rounded-xl border p-3 transition hover:border-primary/50 hover:bg-primary/[0.03]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{t.titles[0]}{t.titles.length > 1 ? ` 他${t.titles.length - 1}件` : ""}</span>
                      <span className="block text-[11px] text-muted-foreground">受付番号 {t.token.slice(0, 8).toUpperCase().replace(/(.{4})(.{4})/, "$1-$2")}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant={t.allChecked ? "default" : "secondary"} className={t.allChecked ? "bg-success/15 text-success" : ""}>{t.allChecked ? "受付済" : "受付前"}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            )}
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
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
                    className="group flex min-h-[44px] items-center gap-4 p-3 rounded-lg hover:bg-primary/[0.04] transition-colors"
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* サービスのお気に入り */}
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
                <Heart className="h-5 w-5 text-primary/70 fill-primary/70" />
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

          {/* 自分の口コミ（FEATURES.REVIEWS が true のときのみ表示） */}
          {FEATURES.REVIEWS && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary/70" />
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
          )}

          {/* AI検定 認定証 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary/70" />
                AI検定 認定証
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/ai-kentei">
                  検定を受ける
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <AiKenteiCertificatesCompact />
            </CardContent>
          </Card>

        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <InAppNotificationsCard />
        </div>
      </div>
    </div>
  );
}
