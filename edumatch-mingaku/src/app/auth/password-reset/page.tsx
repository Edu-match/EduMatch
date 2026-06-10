"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

function PasswordResetForm() {
  const t = useTranslations("authPassword");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "expired") {
      setError(t("errExpired"));
    } else if (err === "invalid_link") {
      setError(t("errInvalidLink"));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errSendFailed"));
        setIsSubmitting(false);
        return;
      }

      router.push("/auth/password-reset-sent");
    } catch {
      setError(t("errSendRetry"));
      setIsSubmitting(false);
    }
  };

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
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("resetTitle")}</CardTitle>
            <p className="text-muted-foreground">{t("resetSubtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("submitting") : t("submitReset")}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                {t("unknownEmailPrefix")}
                <Link href="/contact" className="text-primary hover:underline">
                  {t("contact")}
                </Link>
                {t("unknownEmailSuffix")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<div className="container py-8 max-w-md mx-auto animate-pulse rounded-lg h-64 bg-muted" />}>
      <PasswordResetForm />
    </Suspense>
  );
}
