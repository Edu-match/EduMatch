import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ArrowLeft, ExternalLink } from "lucide-react";
import { FavoritesClient } from "./favorites-client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  await requireAuth();

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            マイページに戻る
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-6 w-6 text-red-500 fill-red-500" />
          <h1 className="text-3xl font-bold">いいねリスト</h1>
        </div>
        <p className="text-muted-foreground">
          いいねした記事やサービスを管理
        </p>
      </div>

      <FavoritesClient />
    </div>
  );
}
