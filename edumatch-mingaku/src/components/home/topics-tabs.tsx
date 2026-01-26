"use client";

import Link from "next/link";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ArticleItem } from "./topics-section";

function ArticleListItem({ article }: { article: ArticleItem }) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="flex gap-3 py-2.5 px-2 -mx-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      <div className="relative h-16 w-16 flex-shrink-0 rounded overflow-hidden border bg-muted">
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover"
          sizes="64px"
          unoptimized
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          {article.isNew && (
            <Badge className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs px-1.5 py-0">
              NEW
            </Badge>
          )}
          <h3 className="font-medium text-sm hover:text-[#1d4ed8] transition-colors line-clamp-2 flex-1">
            {article.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{article.date}</span>
          <span>•</span>
          <span className="text-[#ef4444]">{article.category}</span>
        </div>
      </div>
    </Link>
  );
}

export function TopicsTabs({ articles }: { articles: ArticleItem[] }) {
  const ictArticles = articles.filter((a) => a.category === "教育ICT");
  const caseArticles = articles.filter((a) => a.category === "導入事例");
  const managementArticles = articles.filter((a) => a.category === "学校運営");

  return (
    <Tabs defaultValue="all" className="w-full">
      <div className="border-b">
        <TabsList className="w-full justify-start rounded-none h-auto bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1d4ed8] data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            すべて
          </TabsTrigger>
          <TabsTrigger
            value="ict"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1d4ed8] data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            教育ICT
          </TabsTrigger>
          <TabsTrigger
            value="case"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1d4ed8] data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            導入事例
          </TabsTrigger>
          <TabsTrigger
            value="management"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1d4ed8] data-[state=active]:bg-transparent px-4 py-2 text-sm"
          >
            学校運営
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="p-3">
        <TabsContent value="all" className="mt-0 space-y-0">
          {articles.length > 0 ? (
            articles.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">記事がありません</p>
          )}
        </TabsContent>
        <TabsContent value="ict" className="mt-0 space-y-0">
          {ictArticles.length > 0 ? (
            ictArticles.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">記事がありません</p>
          )}
        </TabsContent>
        <TabsContent value="case" className="mt-0 space-y-0">
          {caseArticles.length > 0 ? (
            caseArticles.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">記事がありません</p>
          )}
        </TabsContent>
        <TabsContent value="management" className="mt-0 space-y-0">
          {managementArticles.length > 0 ? (
            managementArticles.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">記事がありません</p>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
