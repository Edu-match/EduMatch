import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, getCurrentProfile } from "@/lib/auth";
import {
  approvePost,
  rejectPost,
  approveService,
  rejectService,
} from "@/app/_actions";
import {
  getPendingPostsFromSupabase,
  getPendingServicesFromSupabase,
  getApprovedPostsFromSupabase,
  getApprovedServicesFromSupabase,
  getRejectedPostsFromSupabase,
  getRejectedServicesFromSupabase,
} from "@/lib/supabase-pending-approvals";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";

async function ensureAdmin() {
  await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    redirect("/dashboard");
  }
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminApprovalsPage() {
  await ensureAdmin();

  const [
    pendingPosts,
    pendingServices,
    approvedPosts,
    approvedServices,
    rejectedPosts,
    rejectedServices,
  ] = await Promise.all([
    getPendingPostsFromSupabase(),
    getPendingServicesFromSupabase(),
    getApprovedPostsFromSupabase(),
    getApprovedServicesFromSupabase(),
    getRejectedPostsFromSupabase(),
    getRejectedServicesFromSupabase(),
  ]);

  async function approvePostAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    if (!id) return;
    await approvePost(id);
    revalidatePath("/");
    revalidatePath("/admin/approvals");
    revalidatePath("/articles");
  }

  async function rejectPostAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    if (!id) return;
    await rejectPost(id);
    revalidatePath("/");
    revalidatePath("/admin/approvals");
    revalidatePath("/articles");
  }

  async function approveServiceAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    if (!id) return;
    await approveService(id);
    revalidatePath("/");
    revalidatePath("/admin/approvals");
    revalidatePath("/services");
  }

  async function rejectServiceAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    if (!id) return;
    await rejectService(id);
    revalidatePath("/");
    revalidatePath("/admin/approvals");
    revalidatePath("/services");
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold">承認キュー</h1>
          <p className="text-sm text-muted-foreground mt-1">
            記事・サービスの承認・却下・公開状況を管理します
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">ダッシュボードへ</Link>
        </Button>
      </div>

      {/* ブロック1: 承認待ち */}
      <section className="mb-10">
        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                承認待ち
              </span>
              <Badge variant="secondary">
                {pendingPosts.length + pendingServices.length}件
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              申請された記事・サービスを確認して承認すると公開されます
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingPosts.length === 0 && pendingServices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                承認待ちの申請はありません
              </p>
            ) : (
              <>
                {pendingPosts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">記事</h3>
                    <div className="space-y-3">
                      {pendingPosts.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-lg border bg-background space-y-3"
                        >
                          <p className="font-medium line-clamp-2">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            申請者: {p.provider?.name || "投稿者"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <form action={approvePostAction}>
                              <input type="hidden" name="id" value={p.id} />
                              <Button type="submit" size="sm" className="gap-1">
                                <CheckCircle className="h-4 w-4" />
                                承認
                              </Button>
                            </form>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/articles/${p.id}`} target="_blank">
                                <Eye className="h-4 w-4 mr-1" />
                                プレビュー
                              </Link>
                            </Button>
                            <form action={rejectPostAction}>
                              <input type="hidden" name="id" value={p.id} />
                              <Button type="submit" size="sm" variant="destructive" className="gap-1">
                                <XCircle className="h-4 w-4" />
                                却下
                              </Button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pendingServices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">サービス</h3>
                    <div className="space-y-3">
                      {pendingServices.map((s) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-lg border bg-background space-y-3"
                        >
                          <p className="font-medium line-clamp-2">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            申請者: {s.provider?.name || "提供者"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <form action={approveServiceAction}>
                              <input type="hidden" name="id" value={s.id} />
                              <Button type="submit" size="sm" className="gap-1">
                                <CheckCircle className="h-4 w-4" />
                                承認
                              </Button>
                            </form>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/services/${s.id}`} target="_blank">
                                <Eye className="h-4 w-4 mr-1" />
                                プレビュー
                              </Link>
                            </Button>
                            <form action={rejectServiceAction}>
                              <input type="hidden" name="id" value={s.id} />
                              <Button type="submit" size="sm" variant="destructive" className="gap-1">
                                <XCircle className="h-4 w-4" />
                                却下
                              </Button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ブロック2: 公開済み */}
      <section className="mb-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-600" />
              公開済み
              <Badge variant="secondary">{approvedPosts.length + approvedServices.length}件</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              承認され公開中の記事・サービス
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvedPosts.length === 0 && approvedServices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">公開済みはありません</p>
            ) : (
              <>
                {approvedPosts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">記事</h3>
                    <ul className="space-y-2">
                      {approvedPosts.map((p) => (
                        <li key={p.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                          <Link href={`/articles/${p.id}`} className="font-medium hover:underline line-clamp-1">
                            {p.title}
                          </Link>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            承認: {formatDate(p.approved_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {approvedServices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">サービス</h3>
                    <ul className="space-y-2">
                      {approvedServices.map((s) => (
                        <li key={s.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                          <Link href={`/services/${s.id}`} className="font-medium hover:underline line-clamp-1">
                            {s.title}
                          </Link>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            承認: {formatDate(s.approved_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ブロック3: 却下 */}
      <section>
        <Card className="border-red-200/50 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-red-600" />
              却下
              <Badge variant="secondary">{rejectedPosts.length + rejectedServices.length}件</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              却下された記事・サービス
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {rejectedPosts.length === 0 && rejectedServices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">却下されたものはありません</p>
            ) : (
              <>
                {rejectedPosts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">記事</h3>
                    <ul className="space-y-2">
                      {rejectedPosts.map((p) => (
                        <li key={p.id} className="flex flex-col gap-1 py-2 px-3 rounded-md bg-red-50/30 dark:bg-red-950/20">
                          <Link href={`/articles/${p.id}`} className="font-medium hover:underline line-clamp-1">
                            {p.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            却下: {formatDate(p.rejected_at)}
                            {p.rejection_reason && ` — ${p.rejection_reason}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {rejectedServices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">サービス</h3>
                    <ul className="space-y-2">
                      {rejectedServices.map((s) => (
                        <li key={s.id} className="flex flex-col gap-1 py-2 px-3 rounded-md bg-red-50/30 dark:bg-red-950/20">
                          <Link href={`/services/${s.id}`} className="font-medium hover:underline line-clamp-1">
                            {s.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            却下: {formatDate(s.rejected_at)}
                            {s.rejection_reason && ` — ${s.rejection_reason}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

