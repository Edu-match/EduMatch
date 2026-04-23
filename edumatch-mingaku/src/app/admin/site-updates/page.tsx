import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserRole } from "@/app/_actions/user";
import { getSiteUpdatesForAdmin, deleteSiteUpdateAction } from "@/app/_actions/site-updates";
import { Plus, Pencil, ExternalLink, Trash2, SlidersHorizontal } from "lucide-react";
import { SliderToggleButton } from "./_components/slider-toggle-button";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export default async function AdminSiteUpdatesPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const items = await getSiteUpdatesForAdmin(50);
  const sliderCount = items.filter((i) => i.show_in_slider).length;

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">運営記事（サイト更新情報）管理</h1>
        <Button asChild>
          <Link href="/admin/site-updates/new">
            <Plus className="h-4 w-4 mr-2" />
            新規投稿
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        <span>
          トップページのスライダーには <strong className="text-foreground">「スライダー表示中」</strong> に設定した最新5件が表示されます。
          現在 <strong className="text-foreground">{sliderCount}件</strong> が表示対象です。
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">運営記事がまだありません。</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground">{formatDate(item.published_at)}</p>
                      {item.show_in_slider && (
                        <Badge variant="secondary" className="text-xs">スライダー表示中</Badge>
                      )}
                    </div>
                    <p className="font-medium truncate">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                    <SliderToggleButton id={item.id} showInSlider={item.show_in_slider} />
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="元リンク"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/site-updates/${item.id}/edit`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        編集
                      </Link>
                    </Button>
                    <form action={deleteSiteUpdateAction} className="inline">
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
