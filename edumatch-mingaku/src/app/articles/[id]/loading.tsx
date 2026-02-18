import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ArticleDetailLoading() {
  return (
    <div className="container py-8">
      <Skeleton className="h-9 w-32 mb-6" />

      <article className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* メイン画像 */}
        <Skeleton className="h-48 md:h-60 w-full mb-8 rounded-lg" />

        {/* 本文 */}
        <div className="space-y-4 mb-8">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* 提供者情報 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
