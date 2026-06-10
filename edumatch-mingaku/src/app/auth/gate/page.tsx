import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lock,
  UserPlus,
  LogIn,
  BookOpen,
  Star,
  Bell,
  Sparkles,
  Shield,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AuthGatePage() {
  const t = await getTranslations("authGate");

  const benefits = [
    {
      icon: BookOpen,
      title: t("benefit1Title"),
      description: t("benefit1Desc"),
    },
    {
      icon: Star,
      title: t("benefit2Title"),
      description: t("benefit2Desc"),
    },
    {
      icon: Bell,
      title: t("benefit3Title"),
      description: t("benefit3Desc"),
    },
    {
      icon: Sparkles,
      title: t("benefit4Title"),
      description: t("benefit4Desc"),
    },
  ];

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Lock className="h-10 w-10 text-primary" />
            </div>

            <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>

            <p className="text-lg text-muted-foreground mb-8">{t("subtitle")}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button asChild size="lg" className="gap-2">
                <Link href="/auth/login">
                  <UserPlus className="h-5 w-5" />
                  {t("signupFree")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/auth/login">
                  <LogIn className="h-5 w-5" />
                  {t("login")}
                </Link>
              </Button>
            </div>

            <div className="border-t pt-8">
              <h2 className="text-xl font-bold mb-6">{t("benefitsTitle")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={benefit.title}
                      className="p-4 rounded-lg bg-muted/50 text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <p className="font-medium">{benefit.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Shield className="h-5 w-5" />
                <span className="font-medium">{t("securityTitle")}</span>
              </div>
              <p className="text-sm text-green-600 mt-2">{t("securityBody")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
