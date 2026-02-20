"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Newspaper } from "lucide-react";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

type ServiceItem = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  category: string;
};

type PostItem = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: Date;
};

type Props = {
  services: ServiceItem[];
  posts: PostItem[];
  profileName: string;
};

export function ProfileContentsTabs({
  services,
  posts,
  profileName,
}: Props) {
  const hasServices = services.length > 0;
  const hasPosts = posts.length > 0;

  if (!hasServices && !hasPosts) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {profileName}さんはまだ記事やサービスを公開していません。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">
          {profileName}の記事・サービス
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue={hasPosts ? "posts" : "services"} className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b h-12 bg-muted/30">
            <TabsTrigger
              value="posts"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"
            >
              <Newspaper className="h-4 w-4 mr-2" />
              記事（{posts.length}）
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-background"
            >
              <Building2 className="h-4 w-4 mr-2" />
              サービス（{services.length}）
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="m-0 p-4">
            {hasPosts ? (
              <ul className="space-y-3">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/articles/${p.id}`}
                      className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative w-24 flex-shrink-0 overflow-hidden rounded bg-muted aspect-video">
                        <Image
                          src={
                            p.thumbnail_url ||
                            "https://placehold.co/96x64/e0f2fe/0369a1?text=Article"
                          }
                          alt={p.title}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium line-clamp-2">{p.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(p.created_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                記事はまだありません
              </p>
            )}
          </TabsContent>

          <TabsContent value="services" className="m-0 p-4">
            {hasServices ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((s) => (
                  <Link
                    key={s.id}
                    href={`/services/${s.id}`}
                    className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative aspect-video rounded overflow-hidden bg-muted mb-2">
                      <Image
                        src={
                          s.thumbnail_url ||
                          "https://placehold.co/400x225/e0f2fe/0369a1?text=Service"
                        }
                        alt={s.title}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <Badge variant="secondary" className="mb-1">
                      {s.category}
                    </Badge>
                    <h3 className="font-semibold line-clamp-2">{s.title}</h3>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                サービスはまだありません
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
