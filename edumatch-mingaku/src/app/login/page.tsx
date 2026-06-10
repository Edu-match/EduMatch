import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { getTranslations } from "next-intl/server";

function safeRedirect(next: string | undefined): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

async function LoginPageContent({
  redirectTo,
  defaultTab,
}: {
  redirectTo: string;
  defaultTab: "login" | "signup";
}) {
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block mb-6 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
          >
            <span className="text-4xl font-bold text-primary tracking-tight">{tCommon("siteName")}</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2 text-foreground">{t("brandTitle")}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("brandSubtitle")}
          </p>
        </div>

        <Card className="border shadow-lg rounded-xl overflow-hidden bg-card">
          <CardHeader className="space-y-1 pb-2 pt-6 px-6">
            <CardTitle className="text-center text-xl font-semibold">
              {t("cardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 mb-6 rounded-lg bg-muted/60">
                <TabsTrigger
                  value="login"
                  className="rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  {t("tabLogin")}
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  {t("tabSignup")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 focus-visible:outline-none">
                <LoginForm redirectTo={redirectTo} />
              </TabsContent>

              <TabsContent value="signup" className="mt-0 focus-visible:outline-none">
                <SignupForm redirectTo={redirectTo} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6 leading-relaxed">
          {t("footerNote")}
        </p>
      </div>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const redirectTo = safeRedirect(sp.next);
  const defaultTab = sp.tab === "signup" ? "signup" : "login";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="w-full max-w-2xl h-[600px]" />
        </div>
      }
    >
      <LoginPageContent redirectTo={redirectTo} defaultTab={defaultTab} />
    </Suspense>
  );
}
