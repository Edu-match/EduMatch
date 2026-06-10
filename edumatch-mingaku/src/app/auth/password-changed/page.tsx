import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function PasswordChangedPage() {
  const t = await getTranslations("authPassword");

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold mb-4">{t("changedTitle")}</h1>

            <p className="text-muted-foreground mb-8">{t("changedBody")}</p>

            <Button asChild size="lg" className="w-full gap-2">
              <Link href="/auth/login">
                <LogIn className="h-5 w-5" />
                {t("loginButton")}
              </Link>
            </Button>

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t("sessionNote")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
