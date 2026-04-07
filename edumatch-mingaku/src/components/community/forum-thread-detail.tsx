import Link from "next/link";
import { ArrowLeft, Award, Eye, MessageCircle, MessageSquare, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ForumThread } from "@/lib/mock-community";
import { CommentSection } from "./comment-section";
import { RoleBadge } from "./role-badge";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateString));
}

export function ForumThreadDetail({
  thread,
  relatedThreads,
}: {
  thread: ForumThread;
  relatedThreads: ForumThread[];
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      {/* ─── ページヘッダーバー ─── */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/forum">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                相談室一覧
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href="/forum" className="hover:text-foreground transition-colors">
                教育悩み相談室
              </Link>
              <span>/</span>
              <Badge variant="secondary" className="text-xs">{thread.category}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ─── メインコンテンツ ─── */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ── 左：スレッド本文 + コメント ── */}
          <div className="min-w-0 space-y-6">
            {/* スレッド元投稿カード */}
            <Card className="border-2 border-primary/15 shadow-sm">
              <CardHeader className="space-y-4 pb-4">
                {/* メタ情報 */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{thread.category}</Badge>
                  <RoleBadge role={thread.authorRole} />
                  <span className="text-sm text-muted-foreground">{thread.authorName}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(thread.postedAt)}
                  </span>
                </div>

                {/* タイトル */}
                <CardTitle className="text-xl leading-9 md:text-2xl">
                  {thread.title}
                </CardTitle>

                {/* タグ */}
                <div className="flex flex-wrap gap-1.5">
                  {thread.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                {/* スタッツ */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    返信 {thread.replyCount}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    閲覧 {thread.viewCount}
                  </span>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="space-y-5 pt-5">
                {/* 本文 */}
                <div className="rounded-xl bg-muted/40 px-6 py-5">
                  <p className="whitespace-pre-wrap text-sm leading-8 text-foreground/90">
                    {thread.body}
                  </p>
                </div>

                {/* ベストアンサーのヒント */}
                {thread.bestAnswerId ? (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                    <Award className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <p>
                      このスレッドにはベストアンサーが選ばれています。下の「ベストアンサーにする」ボタンで切り替えられるモックUIが確認できます。
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* コメントセクション */}
            <CommentSection
              title="回答・コメント"
              description="返信は1段階のネストで表示されます。参考になった回答をローカルで評価できます。"
              initialComments={thread.comments}
              emptyMessage="まだ回答がありません。最初のコメントを投稿してみましょう。"
              composerTitle="この相談に回答する"
              composerDescription="経験談・参考資料・実践例などを共有できます。匿名投稿も可。"
              submitLabel="回答を投稿"
              allowBestAnswer
              initialBestAnswerId={thread.bestAnswerId}
            />
          </div>

          {/* ── 右サイドバー ── */}
          <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* 関連スレッド */}
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Pin className="h-4 w-4 text-primary" />
                  関連する相談
                </CardTitle>
                <CardDescription className="text-xs">
                  他のスレッドも見てみましょう
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {relatedThreads.map((t) => (
                  <Link
                    key={t.id}
                    href={`/forum/${t.id}`}
                    className="block rounded-lg border p-3 transition-all duration-150 hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">{t.category}</Badge>
                        <RoleBadge role={t.authorRole} />
                      </div>
                      <p className="text-sm font-medium leading-6 line-clamp-2">{t.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {t.replyCount}
                        </span>
                        <span>{formatDate(t.postedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* 一覧に戻るCTA */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col items-center gap-3 py-5 text-center">
                <MessageCircle className="h-8 w-8 text-primary/60" />
                <p className="text-sm font-medium">他の相談も見てみましょう</p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/forum">一覧に戻る</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
