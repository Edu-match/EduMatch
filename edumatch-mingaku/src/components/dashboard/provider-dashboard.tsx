import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Package,
  Eye,
  Edit,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getProviderArticles,
  getProviderServices,
  getProviderStats,
  type ProviderArticle,
  type ProviderService,
} from "@/app/_actions";

type PendingPost = { id: string; title: string; content: string; provider?: { name?: string | null } | null };
type PendingService = { id: string; title: string; description: string; provider?: { name?: string | null } | null };


function getStatusBadge(status: string, isPublished: boolean) {
  if (isPublished) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">公開中</Badge>;
  }
  
  switch (status) {
    case "DRAFT":
      return <Badge variant="outline">下書き</Badge>;
    case "PENDING":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">審査中</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">却下</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export async function ProviderDashboard({
  displayName,
  isAdmin = false,
  pendingPosts = [],
  pendingServices = [],
  approvePostAction,
  rejectPostAction,
  approveServiceAction,
  rejectServiceAction,
}: {
  displayName: string;
  isAdmin?: boolean;
  pendingPosts?: PendingPost[];
  pendingServices?: PendingService[];
  approvePostAction?: (formData: FormData) => Promise<void>;
  rejectPostAction?: (formData: FormData) => Promise<void>;
  approveServiceAction?: (formData: FormData) => Promise<void>;
  rejectServiceAction?: (formData: FormData) => Promise<void>;
}) {
  const [articles, services, stats] = await Promise.all([
    getProviderArticles(),
    getProviderServices(),
    getProviderStats(),
  ]);

  const hasPendingApprovals =
    isAdmin &&
    pendingPosts.length + pendingServices.length > 0 &&
    approvePostAction &&
    rejectPostAction &&
    approveServiceAction &&
    rejectServiceAction;

  // 下書きは「DRAFT かつ 未公開」のみ表示
  const draftArticles = articles.filter((a) => a.status === "DRAFT" && !a.is_published);
  const draftServices = services.filter((s) => s.status === "DRAFT" && !s.is_published);
  const hasDrafts = draftArticles.length > 0 || draftServices.length > 0;

  return (
    <div className="container py-6 md:py-8 max-w-5xl">
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">投稿者ダッシュボード</h1>
        <p className="text-muted-foreground mt-1">こんにちは、{displayName}さん</p>
      </header>

      {/* クイックアクション（上部に配置） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Button asChild size="lg" className="h-14 shadow-sm">
          <Link href="/articles/create" className="flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" />
            新規記事を投稿
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 shadow-sm">
          <Link href="/services/create" className="flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" />
            新規サービスを投稿
          </Link>
        </Button>
      </div>

      {/* 統計カード */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">概要</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-muted/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">記事</span>
                <FileText className="h-4 w-4 text-muted-foreground/70" />
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalArticles}</p>
              <p className="text-xs text-muted-foreground">公開中 {stats.publishedArticles}件</p>
            </CardContent>
          </Card>
          <Card className="border-muted/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">サービス</span>
                <Package className="h-4 w-4 text-muted-foreground/70" />
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalServices}</p>
              <p className="text-xs text-muted-foreground">公開中 {stats.publishedServices}件</p>
            </CardContent>
          </Card>
          <Card className="border-muted/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">閲覧数</span>
                <Eye className="h-4 w-4 text-muted-foreground/70" />
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">記事合計</p>
            </CardContent>
          </Card>
          <Card className="border-muted/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ステータス</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground/70" />
              </div>
              <p className="text-2xl font-bold mt-1">アクティブ</p>
              <p className="text-xs text-muted-foreground">投稿可能</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 管理者向け: 承認待ち（最大10件・Supabase連携） */}
      {hasPendingApprovals && (
        <section className="mb-8">
          <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
                <Clock className="h-4 w-4" />
                承認待ち（最大10件表示）
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                申請された記事・サービスを承認するとサイトに公開されます
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {pendingPosts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    記事の申請
                  </h3>
                  <ul className="space-y-3">
                    {pendingPosts.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-col gap-2 p-3 rounded-lg bg-background/80 border border-border/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{p.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            申請者: {p.provider?.name || "投稿者"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={approvePostAction} className="inline">
                            <input type="hidden" name="id" value={p.id} />
                            <Button type="submit" size="sm" className="gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              承認
                            </Button>
                          </form>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/articles/${p.id}`} target="_blank">
                              プレビュー
                            </Link>
                          </Button>
                          <form action={rejectPostAction} className="inline flex items-center gap-1.5">
                            <input type="hidden" name="id" value={p.id} />
                            <Input
                              name="reason"
                              placeholder="却下理由（任意）"
                              className="h-8 w-24 text-xs"
                            />
                            <Button type="submit" size="sm" variant="destructive" className="gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              却下
                            </Button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pendingServices.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    サービスの申請
                  </h3>
                  <ul className="space-y-3">
                    {pendingServices.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-col gap-2 p-3 rounded-lg bg-background/80 border border-border/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            申請者: {s.provider?.name || "提供者"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={approveServiceAction} className="inline">
                            <input type="hidden" name="id" value={s.id} />
                            <Button type="submit" size="sm" className="gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              承認
                            </Button>
                          </form>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/services/${s.id}`} target="_blank">
                              プレビュー
                            </Link>
                          </Button>
                          <form action={rejectServiceAction} className="inline flex items-center gap-1.5">
                            <input type="hidden" name="id" value={s.id} />
                            <Input
                              name="reason"
                              placeholder="却下理由（任意）"
                              className="h-8 w-24 text-xs"
                            />
                            <Button type="submit" size="sm" variant="destructive" className="gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              却下
                            </Button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/admin/approvals">承認キューをすべて見る</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 下書き一覧 */}
      {hasDrafts && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">下書き</h2>
          <Card className="border-amber-200/80 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                編集中の記事・サービスを続きから編集できます（{draftArticles.length + draftServices.length}件）
              </p>
              <ul className="space-y-2">
                {draftArticles.map((article) => (
                  <li
                    key={article.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-background/80 border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{article.title || "（無題）"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(article.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/articles/${article.id}`} title="プレビュー">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/articles/${article.id}/edit`} title="編集">
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
                {draftServices.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-background/80 border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{service.title || "（無題）"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(service.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/services/${service.id}`} title="プレビュー">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/services/${service.id}/edit`} title="編集">
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 記事一覧 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">投稿記事</h2>
      <Card className="border-muted/50">
        <CardContent className="pt-4">
          {articles.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm mb-3">まだ記事を投稿していません</p>
              <Button asChild size="sm">
                <Link href="/articles/create">最初の記事を投稿する</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{article.title}</h3>
                      {getStatusBadge(article.status, article.is_published)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{article.category}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.view_count}
                      </span>
                      <span>{formatDate(article.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/articles/${article.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/articles/${article.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </section>

      {/* サービス一覧 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">投稿サービス</h2>
      <Card className="border-muted/50">
        <CardContent className="pt-4">
          {services.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm mb-3">まだサービスを投稿していません</p>
              <Button asChild size="sm">
                <Link href="/services/create">最初のサービスを投稿する</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{service.title}</h3>
                      {getStatusBadge(service.status, service.is_published)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{service.category}</span>
                      <span>{formatDate(service.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/services/${service.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/services/${service.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </section>
    </div>
  );
}
