import { Card, CardContent } from "@/components/ui/card";
import { ContentRenderer } from "@/components/ui/content-renderer";
import { getSitePage } from "@/app/_actions/site-pages";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";

export default async function ServiceContentPage() {
  const page = await getSitePage("service_content");
  const profile = await getCurrentProfile();
  const hasContent = !!page.body?.trim();

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{page.title || "サービス内容一覧"}</h1>
          {profile?.role === "ADMIN" && (
            <Link
              href="/admin/pages/service_content/edit"
              className="text-sm text-primary hover:underline"
            >
              編集
            </Link>
          )}
        </div>

        {hasContent ? (
          <Card>
            <CardContent className="p-8 prose prose-slate max-w-none">
              <ContentRenderer content={page.body} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>コンテンツがまだ登録されていません。</p>
              {profile?.role === "ADMIN" && (
                <Link
                  href="/admin/pages/service_content/edit"
                  className="text-primary hover:underline mt-2 inline-block"
                >
                  編集画面で追加する
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
