"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, ExternalLink } from "lucide-react";
import { AddToRequestListButton } from "@/components/request-list/add-to-request-list-button";
import type { ServiceForList } from "./page";

export function ServicesClient({ services }: { services: ServiceForList[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // DBから取得したサービスのカテゴリを動的に生成
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(services.map((s) => s.category)));
    return [
      { value: "all", label: "すべて" },
      ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [services]);

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* ヘッダーセクション */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              EdTechサービス一覧
            </h1>
            <p className="text-lg text-muted-foreground">
              {services.length}以上のEdTechツールから、あなたに最適なサービスを見つけましょう
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* 検索・フィルターエリア */}
        <Card className="mb-8 shadow-lg border-2">
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

              {/* カテゴリフィルター（タブ形式） */}
              <div className="flex items-center gap-2 pb-2 overflow-x-auto">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  カテゴリ:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((category) => (
                    <Button
                      key={category.value}
                      variant={selectedCategory === category.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.value)}
                      className="transition-all hover:scale-105"
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>
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

        {/* サービス一覧グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredServices.map((service, index) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className="group block h-full"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/50 bg-card">
                {/* 画像エリア */}
                <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* 資料請求リストに追加（マーク） */}
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
      </div>
    </div>
  );
}
