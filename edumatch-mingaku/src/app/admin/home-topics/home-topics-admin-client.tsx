"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  setHomeNewsTabAction,
  updateHomeNewsTabBulkAction,
  type HomeTopicsAdminPost,
} from "@/app/_actions/home-topics";
import type { HomeNewsTab } from "@prisma/client";
import { Check, Loader2, Save } from "lucide-react";

const TAB_LABELS: Record<HomeNewsTab, string> = {
  NONE: "表示しない",
  DOMESTIC: "国内ニュース",
  INTERNATIONAL: "海外ニュース",
  WEEKLY: "週間ニュース",
};

export function HomeTopicsAdminClient({ posts }: { posts: HomeTopicsAdminPost[] }) {
  const [tabByPostId, setTabByPostId] = useState<Record<string, HomeNewsTab>>(() =>
    Object.fromEntries(posts.map((p) => [p.id, p.home_news_tab]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const handleSaveOne = async (postId: string) => {
    const tab = tabByPostId[postId];
    if (tab == null) return;
    setSavingId(postId);
    setLastSavedId(null);
    try {
      const result = await setHomeNewsTabAction(postId, tab);
      if (result.success) {
        toast.success("保存しました");
        setLastSavedId(postId);
      } else {
        toast.error(result.error ?? "保存に失敗しました");
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkSave = async () => {
    setBulkSaving(true);
    try {
      const updates = posts.map((p) => ({ id: p.id, tab: tabByPostId[p.id] ?? p.home_news_tab }));
      const result = await updateHomeNewsTabBulkAction(updates);
      if (result.success) {
        toast.success(`${result.count ?? 0} 件を保存しました`);
      } else {
        toast.error(result.error ?? "一括保存に失敗しました");
      }
    } catch {
      toast.error("一括保存に失敗しました");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">記事一覧（直近 {posts.length} 件）</CardTitle>
        <Button
          type="button"
          size="sm"
          onClick={handleBulkSave}
          disabled={bulkSaving}
        >
          {bulkSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          一括保存
        </Button>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">対象の記事がありません。</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 border-b last:border-b-0 pb-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{post.title}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                    {post.category && <span>カテゴリ: {post.category}</span>}
                    <span>
                      投稿日:{" "}
                      {new Intl.DateTimeFormat("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        timeZone: "Asia/Tokyo",
                      }).format(post.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={tabByPostId[post.id] ?? post.home_news_tab}
                    onValueChange={(value) =>
                      setTabByPostId((prev) => ({ ...prev, [post.id]: value as HomeNewsTab }))
                    }
                  >
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveOne(post.id)}
                    disabled={savingId === post.id}
                  >
                    {savingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : lastSavedId === post.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">
                      {savingId === post.id ? "保存中..." : lastSavedId === post.id ? "保存済" : "保存"}
                    </span>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/articles/${post.id}`} target="_blank" rel="noopener noreferrer">
                      記事を見る
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
