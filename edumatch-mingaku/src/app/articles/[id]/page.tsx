import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ArrowLeft, Eye, User, Play, Pencil } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { getTranslations, getLocale } from "next-intl/server";
import { translateText, translateBatch } from "@/lib/translate";
import { localizeArticleCategory } from "@/lib/category-i18n";
import type { Locale } from "@/i18n/config";
import { getPostById, getLatestPosts, recordView } from "@/app/_actions";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { notFound } from "next/navigation";
import { YouTubeEmbed } from "@/components/ui/youtube-embed";
import { ArticleDetailActions } from "./article-detail-actions";
import { ContentRenderer } from "@/components/ui/content-renderer";
import { isImportedContent, parseImportedContent } from "@/lib/imported-content";
import { ImportedContentRenderer } from "@/components/content/imported-content-renderer";
import { ShareButton } from "@/components/ui/share-button";
import { ThumbnailOrTitle } from "@/components/ui/thumbnail-or-title";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";

export const dynamic = "force-dynamic";

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(date);
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

  const t = await getTranslations("article");
  const locale = (await getLocale()) as Locale;

  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (user) {
    await recordView(user.id, "ARTICLE", id);
  }
  const canEdit = user && (user.id === post.provider_id || profile?.role === "ADMIN");

  // 関連記事を取得
  const relatedPosts = await getLatestPosts(4);
  const filteredRelatedPostsRaw = relatedPosts.filter((p) => p.id !== post.id).slice(0, 3);

  // DB 由来テキストを表示言語へ機械翻訳
  const [translatedTitle, translatedContent, relatedTitles] = await Promise.all([
    translateText(post.title, locale),
    translateText(post.content, locale),
    translateBatch(filteredRelatedPostsRaw.map((p) => p.title), locale),
  ]);
  const filteredRelatedPosts = filteredRelatedPostsRaw.map((p, i) => ({
    ...p,
    title: relatedTitles[i],
  }));
  const postTitle = translatedTitle;
  const postContent = translatedContent;

  const category = localizeArticleCategory(post.category || "未分類", locale);
  const authorName = post.author_display_name ?? post.provider?.name ?? t("officeName");

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/articles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToList")}
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
              {formatDate(post.created_at, locale)}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              {t("views", { count: post.view_count.toLocaleString() })}
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {postTitle}
          </h1>
          <div className="flex items-center justify-between">
            <Link
              href={post.provider?.id ? `/profile/${post.provider.id}` : "#"}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {post.provider?.avatar_url ? (
                <Image
                  src={post.provider.avatar_url}
                  alt={authorName}
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
              <p className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {authorName}
              </p>
              <span className="text-xs text-primary">{t("viewProfile")}</span>
            </Link>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/articles/${post.id}/edit`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {t("edit")}
                  </Link>
                </Button>
              )}
              <ArticleDetailActions
                articleId={post.id}
                title={postTitle}
                thumbnailUrl={post.thumbnail_url}
                category={category}
              />
              <ShareButton
                url={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/articles/${post.id}`}
                title={postTitle}
                text={`${postTitle} - ${t("officeName")}`}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* メイン画像 */}
        <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <ThumbnailOrTitle
            src={post.thumbnail_url ?? undefined}
            title={postTitle}
            fill
            className="object-contain"
            unoptimized
          />
        </div>

        {/* YouTube動画 */}
        {post.youtube_url && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold">{t("relatedVideo")}</h2>
            </div>
            <YouTubeEmbed url={post.youtube_url} title={postTitle} />
          </div>
        )}

        {/* 追加画像ギャラリー */}
        {post.images && post.images.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">{t("imageGallery")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {post.images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                >
                  <ImageWithUrlError
                    originalSrc={imageUrl}
                    alt={t("imageAlt", { title: postTitle, index: index + 1 })}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 本文 */}
        <div className="prose prose-slate max-w-none mb-8">
          {isImportedContent(post.content) ? (
            (() => {
              const parsed = parseImportedContent(post.content);
              return parsed ? (
                <ImportedContentRenderer type={parsed.type} content={parsed.raw} />
              ) : (
                <ContentRenderer content={post.content} />
              );
            })()
          ) : (
            <ContentRenderer content={postContent} />
          )}
        </div>

        {/* 提供者情報 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {post.provider.avatar_url ? (
                <Image
                  src={post.provider.avatar_url}
                  alt={authorName}
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
                <p className="font-semibold text-lg">{authorName}</p>
                <p className="text-sm text-muted-foreground">
                  {t("author")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 関連記事 */}
        {filteredRelatedPosts.length > 0 && (
          <Card className="mt-12">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">{t("relatedArticles")}</h2>
              <div className="space-y-4">
                {filteredRelatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/articles/${relatedPost.id}`}
                    className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="relative w-24 flex-shrink-0 overflow-hidden rounded bg-muted aspect-video flex items-center justify-center">
                        <ThumbnailOrTitle
                          src={relatedPost.thumbnail_url ?? undefined}
                          title={relatedPost.title}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-2 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(relatedPost.created_at, locale)}
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
