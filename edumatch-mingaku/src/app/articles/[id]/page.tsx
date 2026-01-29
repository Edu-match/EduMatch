import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ArrowLeft, Share2, Eye, User, Play } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getPostById, getLatestPosts, recordView } from "@/app/_actions";
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

// カテゴリを推測（将来的にはDBにカテゴリカラムを追加）
function getCategory(content: string): string {
  if (content.includes("ICT") || content.includes("デジタル") || content.includes("AI")) {
    return "教育ICT";
  }
  if (content.includes("事例") || content.includes("実践") || content.includes("導入")) {
    return "導入事例";
  }
  if (content.includes("運営") || content.includes("保護者") || content.includes("働き方")) {
    return "学校運営";
  }
  return "教育ICT";
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  unstable_noStore();
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  const user = await getCurrentUser();
  if (user) {
    await recordView(user.id, "ARTICLE", id);
  }

  // 関連記事を取得
  const relatedPosts = await getLatestPosts(4);
  const filteredRelatedPosts = relatedPosts.filter((p) => p.id !== post.id).slice(0, 3);

  const category = getCategory(post.content);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/articles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            記事一覧に戻る
          </Link>
        </Button>
      </div>

      <article className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="secondary">{category}</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(post.created_at)}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              {post.view_count.toLocaleString()}回閲覧
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {post.title}
          </h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.provider?.avatar_url ? (
                <Image
                  src={post.provider.avatar_url}
                  alt={post.provider.name || "投稿者"}
                  width={32}
                  height={32}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {post.provider?.name || "投稿者"}
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              共有
            </Button>
          </div>
        </div>

        {/* メイン画像 */}
        <div className="relative h-64 md:h-96 w-full mb-8 rounded-lg overflow-hidden bg-muted">
          <Image
            src={post.thumbnail_url || "https://placehold.co/800x450/e0f2fe/0369a1?text=Article"}
            alt={post.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* YouTube動画 */}
        {post.youtube_url && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold">関連動画</h2>
            </div>
            <YouTubeEmbed url={post.youtube_url} title={post.title} />
          </div>
        )}

        {/* 追加画像ギャラリー */}
        {post.images && post.images.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">画像ギャラリー</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {post.images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-video rounded-lg overflow-hidden bg-muted"
                >
                  <Image
                    src={imageUrl}
                    alt={`${post.title} - 画像${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 本文 */}
        <div className="prose prose-slate max-w-none mb-8">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {post.content}
          </div>
        </div>

        {/* 提供者情報 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {post.provider.avatar_url ? (
                <Image
                  src={post.provider.avatar_url}
                  alt={post.provider.name}
                  width={64}
                  height={64}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">{post.provider.name}</p>
                <p className="text-sm text-muted-foreground">
                  この記事の執筆者
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 関連記事 */}
        {filteredRelatedPosts.length > 0 && (
          <Card className="mt-12">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">関連記事</h2>
              <div className="space-y-4">
                {filteredRelatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/articles/${relatedPost.id}`}
                    className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-16 w-24 flex-shrink-0 rounded overflow-hidden bg-muted">
                        <Image
                          src={relatedPost.thumbnail_url || "https://placehold.co/120x80/e0f2fe/0369a1?text=Article"}
                          alt={relatedPost.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-2 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(relatedPost.created_at)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </article>
    </div>
  );
}
