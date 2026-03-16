import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentRenderer } from "@/components/ui/content-renderer";
import { getSitePage } from "@/app/_actions/site-pages";
import { getDefaultContentForEdit } from "@/lib/default-site-pages";
import { getCurrentProfile } from "@/lib/auth";
import type { SitePageKey } from "@/app/_actions/site-pages";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "運営について",
  description:
    "エデュマッチは教育現場と教育サービスをつなぐプラットフォームです。私たちは、教育現場が抱える課題を解決し、より良い教育環境の実現をサポートします。",
};

export default async function AboutPage() {
  const [aboutPage, companyInfoPage, profile] = await Promise.all([
    getSitePage("about"),
    getSitePage("company_info"),
    getCurrentProfile(),
  ]);

  const aboutContent = aboutPage.body?.trim()
    ? aboutPage.body
    : getDefaultContentForEdit("about" as SitePageKey, null);
  const companyInfoContent = companyInfoPage.body?.trim()
    ? companyInfoPage.body
    : getDefaultContentForEdit("company_info" as SitePageKey, null);
  const isAdmin = profile?.role === "ADMIN";

  return (
    <div className="container py-8">
      {/* ヒーローセクション */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">会社概要</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          教育の未来を見つける、つながる。
          <br />
          エデュマッチは教育現場と教育サービスをつなぐプラットフォームです。
        </p>
      </div>

      {/* 運営について（ミッション・価値観） */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">運営について</h2>
          {isAdmin && (
            <Link
              href="/admin/pages/about/edit"
              className="text-sm text-primary hover:underline"
            >
              編集
            </Link>
          )}
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 prose prose-slate max-w-none">
            <ContentRenderer content={aboutContent} />
          </CardContent>
        </Card>
      </section>

      {/* 会社情報 */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">会社情報</h2>
          {isAdmin && (
            <Link
              href="/admin/pages/company_info/edit"
              className="text-sm text-primary hover:underline"
            >
              編集
            </Link>
          )}
        </div>
        <Card>
          <CardContent className="p-6 prose prose-slate max-w-none">
            <ContentRenderer content={companyInfoContent} />
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section>
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">お問い合わせ</h2>
            <p className="text-muted-foreground mb-6">
              サービスに関するお問い合わせ、取材依頼、パートナーシップのご相談など、
              お気軽にご連絡ください。
            </p>
            <Button asChild size="lg">
              <Link href="/contact">
                お問い合わせする
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
