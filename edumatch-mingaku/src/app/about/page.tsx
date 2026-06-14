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
import { getTranslations, getLocale } from "next-intl/server";
import { translateText } from "@/lib/translate";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const locale = (await getLocale()) as Locale;
  const [aboutPage, companyInfoPage, profile] = await Promise.all([
    getSitePage("about"),
    getSitePage("company_info"),
    getCurrentProfile(),
  ]);

  const aboutContentRaw = aboutPage.body?.trim()
    ? aboutPage.body
    : getDefaultContentForEdit("about" as SitePageKey, null);
  const companyInfoContentRaw = companyInfoPage.body?.trim()
    ? companyInfoPage.body
    : getDefaultContentForEdit("company_info" as SitePageKey, null);

  const [aboutContent, companyInfoContent] = await Promise.all([
    translateText(aboutContentRaw, locale),
    translateText(companyInfoContentRaw, locale),
  ]);
  const isAdmin = profile?.role === "ADMIN";

  return (
    <div className="container py-8">
      {/* ヒーローセクション */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">{t("heroTitle")}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t("heroBody1")}
          <br />
          {t("heroBody2")}
        </p>
      </div>

      {/* 運営について（ミッション・価値観） */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t("aboutSection")}</h2>
          {isAdmin && (
            <Link
              href="/admin/pages/about/edit"
              className="text-sm text-primary hover:underline"
            >
              {t("edit")}
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
          <h2 className="text-2xl font-bold">{t("companySection")}</h2>
          {isAdmin && (
            <Link
              href="/admin/pages/company_info/edit"
              className="text-sm text-primary hover:underline"
            >
              {t("edit")}
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
            <h2 className="text-2xl font-bold mb-4">{t("ctaTitle")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("ctaBody")}
            </p>
            <Button asChild size="lg">
              <Link href="/contact">
                {t("ctaButton")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
