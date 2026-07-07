"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { localizeArticleCategory } from "@/lib/category-i18n";
import type { Locale } from "@/i18n/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Search, Calendar, ExternalLink, FileText } from "lucide-react";
import { AddToFavoritesButton } from "@/components/favorites/add-to-favorites-button";
import { Reveal } from "@/components/home/reveal";
import type { ArticleForList } from "./page";

const PAGE_SIZE = 30;

/** 公開一覧: 件数が1件以上のカテゴリのみ表示（投稿者ページでは全カテゴリ表示） */
export function ArticlesClient({
  articles,
  categoriesWithCount,
}: {
  articles: ArticleForList[];
  categoriesWithCount: string[];
}) {
  const t = useTranslations("articlesList");
  const locale = useLocale() as Locale;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredArticles.length / PAGE_SIZE);
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ページ変更時にページトップへスクロール
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ヘッダーセクション */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container py-6 md:py-12">
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t("title")}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              {t("subtitle", { count: articles.length })}
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* 検索・フィルターエリア */}
        <Reveal variant="fade-in">
        <Card className="mb-6 shadow-lg border-2">
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  data-tutorial="articles-search"
                  className="pl-12 h-12 text-base border-2 focus:border-primary transition-all"
                />
              </div>

              {/* カテゴリフィルター */}
              <div
                className="flex items-center gap-2 pb-2 overflow-x-auto"
                style={{ WebkitOverflowScrolling: "touch" }}
                data-tutorial="articles-category-filter"
              >
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {t("categoryLabel")}
                </span>
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryChange("all")}
                  className="transition-all hover:scale-105 whitespace-nowrap flex-shrink-0"
                >
                  {t("all")}
                </Button>
                {categoriesWithCount.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCategoryChange(category)}
                    className="transition-all hover:scale-105 whitespace-nowrap flex-shrink-0"
                  >
                    {localizeArticleCategory(category, locale)}
                  </Button>
                ))}
              </div>

              {/* 検索結果件数 */}
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">
                  <span className="font-bold text-primary text-lg">{filteredArticles.length}</span>
                  <span className="ml-1">{t("foundCount")}</span>
                </span>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearchChange("")}
                    className="text-xs"
                  >
                    {t("clearSearch")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </Reveal>

        {/* ページネーション（上部） */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredArticles.length}
          pageSize={PAGE_SIZE}
        />

        {/* 記事一覧グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 mb-8">
          {paginatedArticles.map((article, index) => (
            <Reveal key={article.id} delay={index * 50} className="h-full">
            <Link
              href={`/articles/${article.id}`}
              className="group block h-full"
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/50 bg-card">
                {/* 画像エリア */}
                <div className="relative w-full aspect-video overflow-hidden bg-muted flex items-center justify-center">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* お気に入りボタン */}
                  <div className="absolute top-3 left-3 z-10">
                    <AddToFavoritesButton
                      item={{
                        id: article.id,
                        title: article.title,
                        thumbnail: article.image,
                        category: article.category,
                        type: "article",
                      }}
                      variant="icon"
                      tutorialId="article-card-favorite"
                      className="bg-white/95 hover:bg-white shadow-lg border-0"
                    />
                  </div>

                  {/* NEWバッジ */}
                  {article.isNew && (
                    <div className="absolute top-3 left-3 z-10 ml-12">
                      <Badge className="bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse">
                        NEW
                      </Badge>
                    </div>
                  )}

                  {/* カテゴリバッジ（画像上） */}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-white/95 text-foreground border shadow-lg">
                      {localizeArticleCategory(article.category, locale)}
                    </Badge>
                  </div>

                  {/* ホバー時のアイコン */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                      <FileText className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {/* コンテンツエリア */}
                <CardContent className="p-3 sm:p-5">
                  <div className="mb-3">
                    <h3 className="text-base sm:text-lg font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>

                  {/* 日付とアクション */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(article.date).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP")}</span>
                    </div>
                    <Button
                      size="sm"
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      variant="ghost"
                    >
                      {t("readArticle")}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
            </Reveal>
          ))}
        </div>

        {/* 検索結果なし */}
        {filteredArticles.length === 0 && (
          <Card className="py-16">
            <CardContent className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("noResultsTitle")}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t("noResultsBody")}
              </p>
              <Button onClick={() => {
                handleSearchChange("");
                handleCategoryChange("all");
              }}>
                {t("resetSearch")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ページネーション（下部） */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredArticles.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
