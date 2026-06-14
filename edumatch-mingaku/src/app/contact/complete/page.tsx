import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Clock, Home, HelpCircle } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";

type Props = { searchParams: Promise<{ email?: string; category?: string; inquiryId?: string }> };

export default async function ContactCompletePage({ searchParams }: Props) {
  const t = await getTranslations("contactComplete");
  const locale = (await getLocale()) as Locale;
  const { email, category, inquiryId: paramInquiryId } = await searchParams;
  const inquiryId = paramInquiryId ?? `INQ-${Date.now().toString(36).toUpperCase()}`;
  const inquiryDetails = {
    inquiryId,
    category: category || t("defaultCategory"),
    date: new Date().toLocaleDateString(locale === "en" ? "en-US" : "ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Tokyo",
    }),
    email: email || "",
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>

            <p className="text-lg text-muted-foreground mb-8">{t("body")}</p>

            <Card className="text-left mb-8">
              <CardContent className="p-6">
                <h2 className="font-bold mb-4">{t("detailsTitle")}</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("inquiryId")}</span>
                    <span className="font-mono font-bold text-primary">
                      {inquiryDetails.inquiryId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("category")}</span>
                    <span>{inquiryDetails.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("date")}</span>
                    <span>{inquiryDetails.date}</span>
                  </div>
                  {inquiryDetails.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("replyTo")}</span>
                      <span>{inquiryDetails.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-lg bg-muted/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-medium">{t("responseTimeTitle")}</p>
                </div>
                <p className="text-sm text-muted-foreground">{t("responseTimeBody")}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <p className="font-medium">{t("confirmEmailTitle")}</p>
                </div>
                <p className="text-sm text-muted-foreground">{t("confirmEmailBody")}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-8 text-left">
              <p className="text-sm text-amber-700">
                <strong>{t("inquiryId")}</strong>
                {t("idNote")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  {t("goHome")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/faq">
                  <HelpCircle className="h-4 w-4" />
                  {t("viewFaq")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
