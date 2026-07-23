import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbnailOrTitle } from "@/components/ui/thumbnail-or-title";
import { ServiceCategoryBadges } from "@/components/services/service-category-badges";

/**
 * サービス一覧（/services）でのカード表示イメージ。
 * 公開前プレビューで「一覧にどう並ぶか」を企業に見せるための静的レンダリング
 * （services-client.tsx のカードマークアップと揃えること）。
 */
export function ServiceListCardPreview({
  title,
  description,
  thumbnailUrl,
  category,
  priceInfo,
}: {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  category: string;
  priceInfo: string;
}) {
  return (
    <div className="pointer-events-none mx-auto w-full max-w-sm">
      <Card className="h-full overflow-hidden border-2 bg-card">
        {/* 画像エリア */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted">
          <ThumbnailOrTitle
            src={thumbnailUrl ?? undefined}
            title={title}
            fill
            className="object-contain"
            unoptimized
          />
          {/* カテゴリバッジ（画像上） */}
          <div className="absolute left-3 right-3 top-3 flex min-w-0 justify-end">
            <ServiceCategoryBadges
              category={category}
              compact
              badgeClassName="bg-white/95 text-foreground border shadow-lg"
            />
          </div>
        </div>

        {/* コンテンツエリア */}
        <CardContent className="p-3 sm:p-5">
          <div className="mb-3">
            <h3 className="mb-2 line-clamp-2 text-base font-bold sm:text-lg">{title}</h3>
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex flex-col">
              <span className="mb-0.5 text-xs text-muted-foreground">料金</span>
              <span className="text-base font-bold text-primary">{priceInfo}</span>
            </div>
            <Button size="sm" variant="ghost">
              詳細を見る
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
