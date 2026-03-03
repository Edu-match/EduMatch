import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { getCurrentUserRole } from "@/app/_actions/user";
import { getHomeTopicsPostsForAdmin, updateHomeNewsTabAction } from "@/app/_actions/home-topics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HomeNewsTab } from "@prisma/client";

const TAB_LABELS: Record<HomeNewsTab, string> = {
  NONE: "表示しない",
  DOMESTIC: "国内ニュース",
  INTERNATIONAL: "海外ニュース",
  WEEKLY: "週間ニュース",
};

export default async function AdminHomeTopicsPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const posts = await getHomeTopicsPostsForAdmin(100);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">トップページニュースタブ管理</h1>
          <p className="text-sm text-muted-foreground">
            「すべて」「国内ニュース」「海外ニュース」「週間ニュース」の各タブに表示する記事を設定できます。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">トップページを表示</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">記事一覧（直近 {posts.length} 件）</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">対象の記事がありません。</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <form
                  key={post.id}
                  action={updateHomeNewsTabAction}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 border-b last:border-b-0 pb-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{post.title}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                      {post.category && <span>カテゴリ: {post.category}</span>}
                      <span>
                        投稿日:{" "}
                        {format(post.created_at, "yyyy/MM/dd", {
                          locale: ja,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="hidden" name="id" value={post.id} />
                    <Select name="tab" defaultValue={post.home_news_tab}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="タブを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">{TAB_LABELS.NONE}</SelectItem>
                        <SelectItem value="DOMESTIC">{TAB_LABELS.DOMESTIC}</SelectItem>
                        <SelectItem value="INTERNATIONAL">{TAB_LABELS.INTERNATIONAL}</SelectItem>
                        <SelectItem value="WEEKLY">{TAB_LABELS.WEEKLY}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm" variant="outline">
                      保存
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/articles/${post.id}`} target="_blank" rel="noopener noreferrer">
                        記事を見る
                      </Link>
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

