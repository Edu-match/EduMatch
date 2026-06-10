import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  User,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function RegisterCompletePage() {
  const t = await getTranslations("authRegisterComplete");

  const nextSteps = [
    {
      icon: Mail,
      title: t("step1Title"),
      description: t("step1Desc"),
    },
    {
      icon: User,
      title: t("step2Title"),
      description: t("step2Desc"),
    },
    {
      icon: Sparkles,
      title: t("step3Title"),
      description: t("step3Desc"),
    },
  ];

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>

            <p className="text-lg text-muted-foreground mb-2">{t("welcome")}</p>
            <p className="text-muted-foreground mb-8">{t("emailSent")}</p>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-8">
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <Mail className="h-5 w-5" />
                <span className="font-medium">{t("noEmailTitle")}</span>
              </div>
              <p className="text-sm text-amber-600 mt-2">
                {t("noEmailBody")}
                <Link href="/contact" className="underline">
                  {t("contact")}
                </Link>
                {t("noEmailSuffix")}
              </p>
            </div>

            <div className="border-t pt-8 mb-8">
              <h2 className="text-xl font-bold mb-6">{t("nextStepsTitle")}</h2>
              <div className="space-y-4">
                {nextSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 text-left"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-primary" />
                          <p className="font-medium">{step.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/profile/register">
                  {t("setupProfile")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/">
                  <BookOpen className="h-4 w-4" />
                  {t("goHome")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
