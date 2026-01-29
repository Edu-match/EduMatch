import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Building2, Calendar, Play } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getServiceById, getPopularServices, recordView } from "@/app/_actions";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { YouTubeEmbed } from "@/components/ui/youtube-embed";

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

  // 関連サービスを取得
  const relatedServices = await getPopularServices(4);
  const filteredRelatedServices = relatedServices.filter((s) => s.id !== service.id).slice(0, 3);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/services">
            <ArrowLeft className="h-4 w-4 mr-2" />
            サービス一覧に戻る
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ヘッダー */}
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge variant="secondary">{service.category}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(service.created_at)}
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {service.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {service.description}
            </p>
          </div>

          {/* メイン画像 */}
          <div className="relative h-64 md:h-96 w-full rounded-lg overflow-hidden bg-muted">
            <Image
              src={service.thumbnail_url || "https://placehold.co/800x450/e0f2fe/0369a1?text=Service"}
              alt={service.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          {/* YouTube動画 */}
          {service.youtube_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-red-500" />
                  紹介動画
                </CardTitle>
              </CardHeader>
              <CardContent>
                <YouTubeEmbed url={service.youtube_url} title={service.title} />
              </CardContent>
            </Card>
          )}

          {/* 追加画像ギャラリー */}
          {service.images && service.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>画像ギャラリー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {service.images.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden bg-muted"
                    >
                      <Image
                        src={imageUrl}
                        alt={`${service.title} - 画像${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 詳細説明 */}
          <Card>
            <CardHeader>
              <CardTitle>サービス詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                {service.content}
              </div>
            </CardContent>
          </Card>

          {/* 提供企業情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                提供企業
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {service.provider.avatar_url ? (
                  <Image
                    src={service.provider.avatar_url}
                    alt={service.provider.name}
                    width={64}
                    height={64}
                    className="rounded-lg"
                    unoptimized
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">{service.provider.name}</p>
                  <p className="text-sm text-muted-foreground">
                    教育サービス提供企業
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>料金</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary mb-4">
                {service.price_info}
              </p>
              <Button asChild className="w-full" size="lg">
                <Link href={`/request-info?serviceId=${service.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  資料請求する
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>カテゴリ</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-base px-4 py-2">
                {service.category}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>お問い合わせ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/contact">
                  お問い合わせする
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                サービスに関するご質問はこちらから
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 関連サービス */}
      {filteredRelatedServices.length > 0 && (
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>関連サービス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredRelatedServices.map((relatedService) => (
                <Link
                  key={relatedService.id}
                  href={`/services/${relatedService.id}`}
                  className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="relative h-32 w-full mb-3 rounded overflow-hidden bg-muted">
                    <Image
                      src={relatedService.thumbnail_url || "https://placehold.co/300x200/e0f2fe/0369a1?text=Service"}
                      alt={relatedService.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Badge variant="outline" className="mb-2">
                    {relatedService.category}
                  </Badge>
                  <h3 className="font-semibold line-clamp-2 mb-1">
                    {relatedService.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {relatedService.description}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
