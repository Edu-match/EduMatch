import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserRole } from "@/app/_actions/user";
import {
  getHomeSliderArticlesForAdmin,
  addHomeSliderArticle,
  removeHomeSliderArticle,
} from "@/app/_actions/home";
import { getLatestPosts } from "@/app/_actions/posts";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { HomeSliderArticleForm } from "./home-slider-article-form";

export default async function AdminHomeSliderPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [sliderArticles, latestPosts] = await Promise.all([
    getHomeSliderArticlesForAdmin(),
    getLatestPosts(100),
  ]);

  const alreadyIds = new Set(sliderArticles.map((e) => e.post_id));
  const canAdd = latestPosts.filter(
    (p) => (p.status === "APPROVED" || p.is_published) && !alreadyIds.has(p.id)
  );

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            トップへ
          </Link>
        </Button>
        <h1 className="text-xl font-bold">トップスライダー：記事を選択</h1>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        スライダーでは「運営からのお知らせ」の後に、ここで選択した記事が表示されます。追加する記事を選んでください。
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">スライダーに表示する記事（{sliderArticles.length}件）</CardTitle>
          </CardHeader>
          <CardContent>
            {sliderArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">まだ記事が選択されていません。</p>
            ) : (
              <ul className="space-y-2">
                {sliderArticles.map((entry, i) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0"
                  >
                    <span className="text-muted-foreground w-6">{i + 1}.</span>
                    <span className="flex-1 min-w-0 truncate text-sm">{entry.post.title}</span>
                    <HomeSliderArticleForm postId={entry.post_id} action="remove" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">記事を追加</CardTitle>
          </CardHeader>
          <CardContent>
            {canAdd.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                追加できる公開記事がありません。またはすべて追加済みです。
              </p>
            ) : (
              <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                {canAdd.slice(0, 30).map((post) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0"
                  >
                    <span className="flex-1 min-w-0 truncate text-sm">{post.title}</span>
                    <HomeSliderArticleForm postId={post.id} action="add" />
                  </li>
                ))}
              </ul>
            )}
            {canAdd.length > 30 && (
              <p className="text-xs text-muted-foreground mt-2">先頭30件のみ表示しています</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
