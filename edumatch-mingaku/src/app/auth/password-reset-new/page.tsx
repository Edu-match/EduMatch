"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Check } from "lucide-react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { useTranslations } from "next-intl";

export default function PasswordResetNewPage() {
  const t = useTranslations("authPassword");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const requirements = [
    { label: t("reqMinLength"), met: password.length >= 8 },
    { label: t("reqLetter"), met: /[a-zA-Z]/.test(password) },
    { label: t("reqNumber"), met: /[0-9]/.test(password) },
    {
      label: t("reqMatch"),
      met: password === confirmPassword && password.length > 0,
    },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        setError(t("errUpdateFailed"));
        setIsSubmitting(false);
        return;
      }

      router.push("/auth/password-changed");
    } catch (err) {
      console.error("Password update unexpected error:", err);
      setError(t("errUpdateRetry"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("newPasswordTitle")}</CardTitle>
            <p className="text-muted-foreground">{t("newPasswordSubtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("newPasswordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">{t("requirementsTitle")}</p>
                <ul className="space-y-1">
                  {requirements.map((req) => (
                    <li
                      key={req.label}
                      className={`text-sm flex items-center gap-2 ${
                        req.met ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 ${
                          req.met
                            ? "text-green-600"
                            : "text-muted-foreground/30"
                        }`}
                      />
                      {req.label}
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                type="submit"
                disabled={!allRequirementsMet || isSubmitting}
              >
                {isSubmitting ? t("changing") : t("changePassword")}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                {t("invalidLinkPrefix")}
                <Link href="/auth/password-reset" className="text-primary hover:underline">
                  {t("retryReset")}
                </Link>
                {t("invalidLinkMiddle")}
                <Link href="/contact" className="text-primary hover:underline">
                  {t("contact")}
                </Link>
                {t("invalidLinkSuffix")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
