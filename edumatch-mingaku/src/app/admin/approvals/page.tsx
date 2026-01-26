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
  getPendingPosts,
  approveService,
  rejectService,
  getPendingServices,
} from "@/app/_actions";

async function ensureAdmin() {
  await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    redirect("/dashboard");
  }
}

export default async function AdminApprovalsPage() {
  await ensureAdmin();

  const [pendingPosts, pendingServices] = await Promise.all([
    getPendingPosts(),
    getPendingServices(),
  ]);

  async function approvePostAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    if (!id) return;
    await approvePost(id);
    revalidatePath("/admin/approvals");
    revalidatePath("/articles");
  }

  async function rejectPostAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    const reason = String(formData.get("reason") || "").trim();
    if (!id) return;
    await rejectPost(id, reason || undefined);
    revalidatePath("/admin/approvals");
  }

  async function approveServiceAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    if (!id) return;
    await approveService(id);
    revalidatePath("/admin/approvals");
    revalidatePath("/services");
  }

  async function rejectServiceAction(formData: FormData) {
    "use server";
    await ensureAdmin();
    const id = String(formData.get("id") || "");
    const reason = String(formData.get("reason") || "").trim();
    if (!id) return;
    await rejectService(id, reason || undefined);
    revalidatePath("/admin/approvals");
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">承認キュー</h1>
          <p className="text-sm text-muted-foreground">
            投稿申請された記事・サービスを確認して承認すると公開されます。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">ダッシュボードへ</Link>
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">記事の申請</h2>
          <Badge variant="secondary">{pendingPosts.length}件</Badge>
        </div>

        {pendingPosts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              承認待ちの記事はありません
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingPosts.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">{p.title}</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    申請者: {p.provider?.name || "投稿者"} / ID: {p.id}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {p.content}
                  </div>

                  <div className="flex gap-2">
                    <form action={approvePostAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit">承認して公開</Button>
                    </form>
                    <Button asChild variant="outline">
                      <Link href={`/articles/${p.id}`} target="_blank">
                        プレビュー
                      </Link>
                    </Button>
                  </div>

                  <form action={rejectPostAction} className="space-y-2">
                    <input type="hidden" name="id" value={p.id} />
                    <Textarea
                      name="reason"
                      placeholder="却下理由（任意）"
                      className="min-h-[80px]"
                    />
                    <Button type="submit" variant="destructive">
                      却下
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">サービスの申請</h2>
          <Badge variant="secondary">{pendingServices.length}件</Badge>
        </div>

        {pendingServices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              承認待ちのサービスはありません
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingServices.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">{s.title}</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    申請者: {s.provider?.name || "提供者"} / ID: {s.id}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {s.description}
                  </div>

                  <div className="flex gap-2">
                    <form action={approveServiceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit">承認して公開</Button>
                    </form>
                    <Button asChild variant="outline">
                      <Link href={`/services/${s.id}`} target="_blank">
                        プレビュー
                      </Link>
                    </Button>
                  </div>

                  <form action={rejectServiceAction} className="space-y-2">
                    <input type="hidden" name="id" value={s.id} />
                    <Input name="reason" placeholder="却下理由（任意）" />
                    <Button type="submit" variant="destructive">
                      却下
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

