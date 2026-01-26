"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Home, ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  
  return (
    <div className="container py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-8">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>

        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">
          ページが見つかりませんでした
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          お探しのページは移動または削除された可能性があります。
          <br />
          URLをご確認いただくか、以下から検索してください。
        </p>

        {/* 検索ボックス */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              キーワードで検索
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="検索..." className="pl-10" />
              </div>
              <Button>検索</Button>
            </div>
          </CardContent>
        </Card>

        {/* ナビゲーション */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              <Home className="h-5 w-5" />
              トップページへ
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
            前のページに戻る
          </Button>
        </div>

        {/* よくアクセスされるページ */}
        <div className="text-left">
          <h3 className="font-bold mb-4">よくアクセスされるページ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/articles"
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              記事一覧
            </Link>
            <Link
              href="/services"
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              サービス一覧
            </Link>
            <Link
              href="/help"
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              ヘルプ
            </Link>
            <Link
              href="/contact"
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
