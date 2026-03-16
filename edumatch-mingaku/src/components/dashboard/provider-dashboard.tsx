import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">投稿者ダッシュボード</h1>
            <p className="text-muted-foreground">
              こんにちは、{displayName}さん
            </p>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">記事数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles}</div>
            <p className="text-xs text-muted-foreground">
              公開中: {stats.publishedArticles}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">サービス数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              公開中: {stats.publishedServices}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総閲覧数</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              記事の合計閲覧数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ステータス</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">アクティブ</div>
            <p className="text-xs text-muted-foreground">
              投稿可能
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 管理者向け: 承認待ちセクション */}
      {hasPendingApprovals && (
        <Card className="mb-8 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Clock className="h-5 w-5" />
              承認待ち（{pendingPosts.length + pendingServices.length}件）
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              申請された記事・サービスを承認するとサイトに公開されます
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingPosts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">記事の申請</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingPosts.map((p) => (
                    <div key={p.id} className="p-4 border rounded-lg bg-background space-y-3">
                      <div>
                        <p className="font-medium line-clamp-2">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          申請者: {p.provider?.name || "投稿者"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form action={approvePostAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button type="submit" size="sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            承認
                          </Button>
                        </form>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/articles/${p.id}`} target="_blank">
                            プレビュー
                          </Link>
                        </Button>
                      </div>
                      <form action={rejectPostAction} className="flex gap-2 items-end">
                        <input type="hidden" name="id" value={p.id} />
                        <Textarea
                          name="reason"
                          placeholder="却下理由（任意）"
                          className="min-h-[60px] flex-1"
                        />
                        <Button type="submit" size="sm" variant="destructive">
                          <XCircle className="h-4 w-4 mr-1" />
                          却下
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingServices.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">サービスの申請</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingServices.map((s) => (
                    <div key={s.id} className="p-4 border rounded-lg bg-background space-y-3">
                      <div>
                        <p className="font-medium line-clamp-2">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          申請者: {s.provider?.name || "提供者"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form action={approveServiceAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <Button type="submit" size="sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            承認
                          </Button>
                        </form>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/services/${s.id}`} target="_blank">
                            プレビュー
                          </Link>
                        </Button>
                      </div>
                      <form action={rejectServiceAction} className="flex gap-2 items-end">
                        <input type="hidden" name="id" value={s.id} />
                        <Input name="reason" placeholder="却下理由（任意）" className="flex-1" />
                        <Button type="submit" size="sm" variant="destructive">
                          <XCircle className="h-4 w-4 mr-1" />
                          却下
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/approvals">承認キューをすべて見る</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 下書き一覧（下書きがある場合のみ表示） */}
      {hasDrafts && (
        <Card className="mb-8 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <FileText className="h-5 w-5" />
              下書き（{draftArticles.length + draftServices.length}件）
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              編集中の記事・サービスを続きから編集できます
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {draftArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{article.title || "（無題）"}</h3>
                    <p className="text-xs text-muted-foreground">{formatDate(article.updated_at)}</p>
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
              {draftServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{service.title || "（無題）"}</h3>
                    <p className="text-xs text-muted-foreground">{formatDate(service.updated_at)}</p>
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
          </CardContent>
        </Card>
      )}

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Button asChild size="lg" className="h-20">
          <Link href="/articles/create">
            <Plus className="mr-2 h-5 w-5" />
            新規記事を投稿
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-20">
          <Link href="/services/create">
            <Plus className="mr-2 h-5 w-5" />
            新規サービスを投稿
          </Link>
        </Button>
      </div>

      {/* 記事一覧 */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            投稿記事
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/articles/create">
              <Plus className="h-4 w-4 mr-1" />
              新規作成
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="mb-4">まだ記事を投稿していません</p>
              <Button asChild>
                <Link href="/articles/create">最初の記事を投稿する</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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

      {/* サービス一覧 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            投稿サービス
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/services/create">
              <Plus className="h-4 w-4 mr-1" />
              新規作成
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="mb-4">まだサービスを投稿していません</p>
              <Button asChild>
                <Link href="/services/create">最初のサービスを投稿する</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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
    </div>
  );
}
