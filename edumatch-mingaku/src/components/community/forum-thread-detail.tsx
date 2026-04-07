import Link from "next/link";
import { ArrowLeft, Eye, MessageSquare, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="container py-8">
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href="/forum">
            <ArrowLeft className="mr-2 h-4 w-4" />
            相談室一覧に戻る
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Card className="border-2 border-primary/15">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{thread.category}</Badge>
                <RoleBadge role={thread.authorRole} />
                <span className="text-sm text-muted-foreground">{thread.authorName}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(thread.postedAt)}
                </span>
              </div>

              <div className="space-y-3">
                <CardTitle className="text-2xl leading-10 md:text-3xl">
                  {thread.title}
                </CardTitle>
                <CardDescription className="text-base leading-8">
                  {thread.summary}
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                {thread.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  返信 {thread.replyCount}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  閲覧 {thread.viewCount}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl bg-muted/40 p-5">
                <h2 className="mb-3 text-lg font-semibold">元の投稿</h2>
                <p className="whitespace-pre-wrap text-sm leading-8 text-foreground/90">
                  {thread.body}
                </p>
              </div>

              {thread.bestAnswerId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                  スレッド主がベストアンサーを選べるモックを含めています。初期表示では1件が選択済みです。
                </div>
              ) : null}
            </CardContent>
          </Card>

          <CommentSection
            title="回答・コメント"
            description="返信は1段階のネストで表示されます。参考になった回答はローカルで評価できます。"
            initialComments={thread.comments}
            emptyMessage="まだ回答がありません。最初のコメントを投稿してみましょう。"
            composerTitle="この相談に回答する"
            composerDescription="経験談、参考資料、実践例などを共有できます。"
            submitLabel="回答を投稿"
            allowBestAnswer
            initialBestAnswerId={thread.bestAnswerId}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pin className="h-4 w-4 text-primary" />
                関連する相談
              </CardTitle>
              <CardDescription>
                同じコミュニティ内の他スレッドへ移動できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedThreads.map((relatedThread) => (
                <Link
                  key={relatedThread.id}
                  href={`/forum/${relatedThread.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{relatedThread.category}</Badge>
                      <RoleBadge role={relatedThread.authorRole} />
                    </div>
                    <p className="font-semibold leading-6">{relatedThread.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(relatedThread.postedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
