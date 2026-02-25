"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Search, ExternalLink } from "lucide-react";
import { AddToRequestListButton } from "@/components/request-list/add-to-request-list-button";
import type { ServiceForList } from "./page";

const PAGE_SIZE = 30;

/** 公開一覧: 件数が1件以上のカテゴリのみ表示（投稿者ページでは全カテゴリ表示） */
export function ServicesClient({
  services,
  categoriesWithCount,
  displayOrderIds,
}: {
  services: ServiceForList[];
  categoriesWithCount: string[];
  displayOrderIds: string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // カテゴリ「すべて」のときのみ指定順でソート（displayOrderIds の並びに従う）
  const filteredServices =
    selectedCategory === "all" && displayOrderIds.length > 0
      ? [...filtered].sort((a, b) => {
          const ia = displayOrderIds.indexOf(a.id);
          const ib = displayOrderIds.indexOf(b.id);
          const ai = ia === -1 ? 9999 : ia;
          const bi = ib === -1 ? 9999 : ib;
          return ai - bi;
        })
      : filtered;

  const totalPages = Math.ceil(filteredServices.length / PAGE_SIZE);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 検索・カテゴリ変更時に1ページ目に戻る
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // ページ変更時にページトップへスクロール
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ヘッダーセクション */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              サービス一覧
            </h1>
            <p className="text-lg text-muted-foreground">
              {services.length}件のサービスから、あなたに最適なサービスを見つけましょう
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* 検索・フィルターエリア */}
        <Card className="mb-6 shadow-lg border-2">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="サービス名、機能、キーワードで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base border-2 focus:border-primary transition-all"
                />
              </div>

              {/* カテゴリフィルター */}
              <div className="flex items-center gap-2 pb-2 overflow-x-auto flex-wrap">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  カテゴリ:
                </span>
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className="transition-all hover:scale-105"
                >
                  すべて
                </Button>
                {categoriesWithCount.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="transition-all hover:scale-105"
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* 検索結果件数 */}
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">
                  <span className="font-bold text-primary text-lg">{filteredServices.length}</span>
                  <span className="ml-1">件のサービスが見つかりました</span>
                </span>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-xs"
                  >
                    検索をクリア
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ページネーション（上部） */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredServices.length}
          pageSize={PAGE_SIZE}
        />

        {/* サービス一覧グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 mb-8">
          {paginatedServices.map((service, index) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              prefetch={false}
              className="group block h-full"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/50 bg-card">
                {/* 画像エリア */}
                <div className="relative w-full aspect-video overflow-hidden bg-muted flex items-center justify-center">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* サービスのお気に入りに追加 */}
                  <div className="absolute top-3 left-3 z-10">
                    <AddToRequestListButton
                      item={{
                        id: service.id,
                        title: service.name,
                        thumbnail: service.image,
                        category: service.category,
                      }}
                      variant="icon"
                      className="bg-white/95 hover:bg-white shadow-lg border-0"
                    />
                  </div>

                  {/* カテゴリバッジ（画像上） */}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-white/95 text-foreground border shadow-lg">
                      {service.category}
                    </Badge>
                  </div>

                  {/* ホバー時のアイコン */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                      <ExternalLink className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {/* コンテンツエリア */}
                <CardContent className="p-5">
                  <div className="mb-3">
                    <h3 className="text-lg font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  {/* 価格とアクション */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-0.5">料金</span>
                      <span className="font-bold text-primary text-base">
                        {service.price}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      variant="ghost"
                    >
                      詳細を見る
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 検索結果なし */}
        {filteredServices.length === 0 && (
          <Card className="py-16">
            <CardContent className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                条件に一致するサービスが見つかりませんでした
              </h3>
              <p className="text-muted-foreground mb-6">
                検索条件を変更するか、別のキーワードでお試しください
              </p>
              <Button onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}>
                検索をリセット
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ページネーション（下部） */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredServices.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
