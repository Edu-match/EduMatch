import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function PasswordResetSentPage() {
  const t = await getTranslations("authPassword");

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/auth/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToLogin")}
          </Link>
        </Button>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-2xl font-bold mb-4">{t("sentTitle")}</h1>

            <p className="text-muted-foreground mb-6">{t("sentBody")}</p>

            <div className="p-4 rounded-lg bg-muted/50 mb-6 text-left">
              <p className="text-sm text-muted-foreground">
                <strong>{t("nextStepsTitle")}</strong>
                <br />
                {t("step1")}
                <br />
                {t("step2")}
                <br />
                {t("step3")}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
              <p className="text-sm text-amber-700">{t("notReceived")}</p>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href="/auth/password-reset">
                  <RefreshCw className="h-4 w-4" />
                  {t("resend")}
                </Link>
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/contact">{t("contact")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
