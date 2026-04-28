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
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import {
  getProviderArticles,
  getProviderServices,
  getProviderStats,
} from "@/app/_actions";

type PendingPost = { id: string; title: string; content: string; provider?: { name?: string | null } | null };
type PendingService = { id: string; title: string; description: string; provider?: { name?: string | null } | null };

function getStatusBadge(status: string, isPublished: boolean) {
  if (isPublished) {
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 text-xs">公開中</Badge>;
  }
  switch (status) {
    case "DRAFT":
      return <Badge variant="outline" className="text-xs">下書き</Badge>;
    case "PENDING":
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs">審査中</Badge>;
    case "REJECTED":
      return <Badge variant="destructive" className="text-xs">却下</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
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

  const draftArticles = articles.filter((a) => a.status === "DRAFT" && !a.is_published);
  const draftServices = services.filter((s) => s.status === "DRAFT" && !s.is_published);
  const hasDrafts = draftArticles.length > 0 || draftServices.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container py-8 md:py-10 max-w-6xl">
        {/* ヒーローセクション */}
        <section className="mb-10">
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {isAdmin ? "管理者ダッシュボード" : "投稿者ダッシュボード"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isAdmin
                    ? "サイト全体の投稿状況と承認キューを管理できます"
                    : `こんにちは、${displayName}さん`}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Button asChild size="lg" className="gap-2 shadow-md">
                  <Link href="/articles/create">
                    <FileText className="h-5 w-5" />
                    記事を投稿
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link href="/services/create">
                    <Package className="h-5 w-5" />
                    サービスを投稿
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 統計 */}
        <section className="mb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{stats.totalArticles}</p>
                    <p className="text-xs text-muted-foreground">記事（公開 {stats.publishedArticles}）</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{stats.totalServices}</p>
                    <p className="text-xs text-muted-foreground">サービス（公開 {stats.publishedServices}）</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{stats.totalViews.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">総閲覧数</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-3">
                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">アクティブ</p>
                    <p className="text-xs text-muted-foreground">投稿可能</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 管理者向け: 承認待ち */}
        {hasPendingApprovals && (
          <section className="mb-10">
            <Card className="border-amber-200 dark:border-amber-800 overflow-hidden">
              <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-amber-600" />
                  承認待ち（最大10件）
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  申請された記事・サービスを承認するとサイトに公開されます
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {pendingPosts.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                      <p className="text-xs text-muted-foreground">申請者: {p.provider?.name || "投稿者"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={approvePostAction} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" size="sm" className="gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />承認
                        </Button>
                      </form>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/articles/${p.id}`} target="_blank">プレビュー</Link>
                      </Button>
                      <form action={rejectPostAction} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" size="sm" variant="destructive" className="gap-1">
                          <XCircle className="h-3.5 w-3.5" />却下
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
                {pendingServices.map((s) => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{s.title}</p>
                      <p className="text-xs text-muted-foreground">申請者: {s.provider?.name || "提供者"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={approveServiceAction} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" size="sm" className="gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />承認
                        </Button>
                      </form>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/services/${s.id}`} target="_blank">プレビュー</Link>
                      </Button>
                      <form action={rejectServiceAction} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" size="sm" variant="destructive" className="gap-1">
                          <XCircle className="h-3.5 w-3.5" />却下
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/approvals">承認キューをすべて見る</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 下書き */}
        {hasDrafts && (
          <section className="mb-10">
            <Card className="border-amber-200/60 dark:border-amber-800/60 overflow-hidden">
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  下書き（{draftArticles.length + draftServices.length}件）
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {draftArticles.map((a) => (
                    <Link
                      key={a.id}
                      href={`/articles/${a.id}/edit`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{a.title || "（無題）"}</span>
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                  {draftServices.map((s) => (
                    <Link
                      key={s.id}
                      href={`/services/${s.id}/edit`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm"
                    >
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{s.title || "（無題）"}</span>
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 記事・サービス 2カラム */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 記事一覧 */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                投稿記事
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/articles/create" className="gap-1">
                  <Plus className="h-4 w-4" />
                  新規
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {articles.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-muted/20">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">まだ記事がありません</p>
                  <Button asChild size="sm">
                    <Link href="/articles/create">最初の記事を投稿</Link>
                  </Button>
                </div>
              ) : (
                <>
                <ul className="space-y-2">
                  {articles.slice(0, 10).map((article) => (
                    <li key={article.id}>
                      <div className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                        <Link href={`/articles/${article.id}`} className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-primary">
                            {article.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {getStatusBadge(article.status, article.is_published)}
                            <span className="text-xs text-muted-foreground">{article.category}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Eye className="h-3 w-3" /> {article.view_count}
                            </span>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/articles/${article.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/articles/${article.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {articles.length > 10 && (
                  <div className="mt-3 flex justify-end">
                    <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                      <Link href="/articles">
                        すべての記事を見る
                      </Link>
                    </Button>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>

          {/* サービス一覧 */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                投稿サービス
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/services/create" className="gap-1">
                  <Plus className="h-4 w-4" />
                  新規
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-muted/20">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">まだサービスがありません</p>
                  <Button asChild size="sm">
                    <Link href="/services/create">最初のサービスを投稿</Link>
                  </Button>
                </div>
              ) : (
                <>
                <ul className="space-y-2">
                  {services.slice(0, 10).map((service) => (
                    <li key={service.id}>
                      <div className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                        <Link href={`/services/${service.id}`} className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-primary">
                            {service.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {getStatusBadge(service.status, service.is_published)}
                            <span className="text-xs text-muted-foreground">{service.category}</span>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/services/${service.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/services/${service.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {services.length > 10 && (
                  <div className="mt-3 flex justify-end">
                    <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                      <Link href="/services">
                        すべてのサービスを見る
                      </Link>
                    </Button>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
