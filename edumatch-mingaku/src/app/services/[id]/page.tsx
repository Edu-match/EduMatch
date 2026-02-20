import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Building2, Calendar, Play, FileText, Mail, Check, Star, Pencil } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getServiceById, getPopularServices, recordView } from "@/app/_actions";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { YouTubeEmbed } from "@/components/ui/youtube-embed";
import { AddToRequestListServiceButton } from "./service-detail-actions";
import { ContentRenderer } from "@/components/ui/content-renderer";
import { ShareButton } from "@/components/ui/share-button";
import { ReviewSection } from "@/components/ui/review-section";
import { getServiceReviews } from "@/app/_actions/reviews";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  unstable_noStore();
  const { id } = await params;
  const service = await getServiceById(id);

  if (!service) {
    notFound();
  }

  const user = await getCurrentUser();
  if (user) {
    await recordView(user.id, "SERVICE", id);
  }

  // 口コミを取得
  const reviews = await getServiceReviews(id);

  // 関連サービスを取得
  const relatedServices = await getPopularServices(4);
  const filteredRelatedServices = relatedServices.filter((s) => s.id !== service.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      {/* パンくずナビ */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <Button variant="ghost" asChild className="hover:bg-primary/10">
            <Link href="/services">
              <ArrowLeft className="h-4 w-4 mr-2" />
              サービス一覧に戻る
            </Link>
          </Button>
        </div>
      </div>

      {/* ヘロセクション */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-background border-b">
        <div className="container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Badge className="text-sm px-3 py-1">{service.category}</Badge>
                {service.tags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {service.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(service.created_at)}
                </div>
              </div>
              <div className="flex items-start justify-between gap-4 mb-6">
                <h1 className="text-4xl md:text-5xl font-bold leading-tight flex-1">
                  {service.title}
                </h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {user?.id === service.provider_id && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/services/${service.id}/edit`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        編集
                      </Link>
                    </Button>
                  )}
                  <ShareButton
                    url={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/services/${service.id}`}
                    title={service.title}
                    text={`${service.title} - エデュマッチ`}
                    variant="outline"
                    size="sm"
                  />
                </div>
              </div>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {service.description}
              </p>

              {/* CTAボタン（モバイル） */}
              <div className="mt-6 lg:hidden space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="lg" className="shadow-lg">
                    <Link href={`/request-info?serviceId=${service.id}`}>
                      <FileText className="h-5 w-5 mr-2" />
                      資料請求する（無料）
                    </Link>
                  </Button>
                  <AddToRequestListServiceButton
                    serviceId={service.id}
                    title={service.title}
                    thumbnailUrl={service.thumbnail_url}
                    category={service.category}
                  />
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-primary">
                    {service.price_info}
                  </span>
                </div>
              </div>
            </div>

            {/* サムネイル画像（デスクトップ） */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl border-4 border-white/50 bg-muted flex items-center justify-center">
                <Image
                  src={service.thumbnail_url || "https://placehold.co/800x600/e0f2fe/0369a1?text=Service"}
                  alt={service.title}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-8">
            {/* メイン画像（モバイル） */}
            <div className="lg:hidden relative aspect-video w-full rounded-xl overflow-hidden shadow-xl border-2 bg-muted flex items-center justify-center">
              <Image
                src={service.thumbnail_url || "https://placehold.co/800x450/e0f2fe/0369a1?text=Service"}
                alt={service.title}
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {/* YouTube動画 */}
            {service.youtube_url && (
              <Card className="overflow-hidden border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-red-50 to-background">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-red-500 rounded-lg">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                    サービス紹介動画
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <YouTubeEmbed url={service.youtube_url} title={service.title} />
                </CardContent>
              </Card>
            )}

            {/* 詳細説明 */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-background">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  サービス詳細
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-slate max-w-none">
                  <ContentRenderer content={service.content} />
                </div>
              </CardContent>
            </Card>

            {/* 追加画像ギャラリー */}
            {service.images && service.images.length > 0 && (
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-background">
                  <CardTitle>画像ギャラリー</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {service.images.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="group relative aspect-video rounded-lg overflow-hidden bg-muted border-2 hover:border-primary transition-all hover:shadow-xl"
                      >
                        <Image
                          src={imageUrl}
                          alt={`${service.title} - 画像${index + 1}`}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-110"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 提供企業・投稿者情報 */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-background">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  提供企業
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Link
                  href={`/profile/${service.provider.id}`}
                  className="flex items-center gap-6 group"
                >
                  {service.provider.avatar_url ? (
                    <Image
                      src={service.provider.avatar_url}
                      alt={service.provider_display_name ?? service.provider.name}
                      width={80}
                      height={80}
                      className="rounded-xl border-2 shadow-md group-hover:opacity-90 transition-opacity"
                      unoptimized
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 shadow-md">
                      <Building2 className="h-10 w-10 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">
                      {service.provider_display_name ?? service.provider.name}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      教育サービス提供企業
                    </p>
                    <span className="text-sm text-primary font-medium">
                      投稿者プロフィールを見る →
                    </span>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* 口コミセクション */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-background">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  口コミ・レビュー
                  {reviews.length > 0 && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      （{reviews.length} 件）
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ReviewSection serviceId={service.id} initialReviews={reviews} isLoggedIn={!!user} />
              </CardContent>
            </Card>
          </div>

          {/* サイドバー（スティッキー） */}
          <div className="space-y-6 hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* CTA Card */}
              <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground mb-2">料金プラン</p>
                    <p className="text-3xl font-bold text-primary mb-1">
                      {service.price_info}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button asChild className="w-full shadow-lg" size="lg">
                      <Link href={`/request-info?serviceId=${service.id}`}>
                        <FileText className="h-5 w-5 mr-2" />
                        資料請求する（無料）
                      </Link>
                    </Button>
                    <AddToRequestListServiceButton
                      serviceId={service.id}
                      title={service.title}
                      thumbnailUrl={service.thumbnail_url}
                      category={service.category}
                      variant="button"
                      className="w-full"
                    />
                    <ShareButton
                      url={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/services/${service.id}`}
                      title={service.title}
                      text={`${service.title} - エデュマッチ`}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    />
                    <Button asChild variant="outline" className="w-full" size="lg">
                      <Link href="/contact">
                        <Mail className="h-5 w-5 mr-2" />
                        お問い合わせ
                      </Link>
                    </Button>
                  </div>

                  {/* 特典リスト */}
                  <div className="mt-6 pt-6 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>詳細資料を無料でダウンロード</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>導入事例・活用例を確認</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>無料トライアルのご案内</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* カテゴリカード */}
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">カテゴリ</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="text-base px-4 py-2">
                    {service.category}
                  </Badge>
                </CardContent>
              </Card>

            </div>

            {/* モバイル用CTAセクション */}
            <div className="lg:hidden">
              <Card className="border-2 border-primary/20 shadow-2xl sticky bottom-4">
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground mb-1">料金プラン</p>
                    <p className="text-2xl font-bold text-primary">
                      {service.price_info}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button asChild className="w-full shadow-lg" size="lg">
                      <Link href={`/request-info?serviceId=${service.id}`}>
                        <FileText className="h-5 w-5 mr-2" />
                        資料請求する（無料）
                      </Link>
                    </Button>
                    <AddToRequestListServiceButton
                      serviceId={service.id}
                      title={service.title}
                      thumbnailUrl={service.thumbnail_url}
                      category={service.category}
                      variant="button"
                      className="w-full"
                    />
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/contact">
                        <Mail className="h-5 w-5 mr-2" />
                        お問い合わせ
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* 関連サービス */}
        {filteredRelatedServices.length > 0 && (
          <Card className="mt-12 border-2 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-background">
              <CardTitle className="text-2xl">こちらのサービスもおすすめ</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                同じカテゴリの人気サービス
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredRelatedServices.map((relatedService) => (
                  <Link
                    key={relatedService.id}
                    href={`/services/${relatedService.id}`}
                    className="group block"
                  >
                    <Card className="h-full overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                      <div className="relative w-full aspect-video overflow-hidden bg-muted flex items-center justify-center">
                        <Image
                          src={relatedService.thumbnail_url || "https://placehold.co/300x200/e0f2fe/0369a1?text=Service"}
                          alt={relatedService.title}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      </div>
                      <CardContent className="p-4">
                        <Badge variant="outline" className="mb-3">
                          {relatedService.category}
                        </Badge>
                        <h3 className="font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {relatedService.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {relatedService.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
