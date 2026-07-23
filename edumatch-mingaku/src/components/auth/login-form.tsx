"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, Loader2, Chrome, AlertCircle, Building2, UserCircle2, Check } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  onSuccess?: () => void;
  redirectTo?: string;
};

export function LoginForm({ onSuccess, redirectTo = "/" }: Props) {
  const t = useTranslations("auth");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalHint, setGlobalHint] = useState<string | null>(null);
  const [userType, setUserType] = useState<"viewer" | "provider">("viewer");
  const allowProvider = FEATURES.PROVIDER_REGISTRATION;
  const effectiveUserType: "viewer" | "provider" = allowProvider ? userType : "viewer";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    setGlobalError(null);
    setGlobalHint(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          userType: effectiveUserType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setGlobalError(result.error || t("loginFailed"));
        if (result.hint) setGlobalHint(result.hint);
        else setGlobalHint(null);
        setIsSubmitting(false);
        return;
      }

      // セッションを設定してリダイレクト
      if (result.session) {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
      }
      window.location.href = redirectTo;
    } catch {
      setGlobalError(t("loginFailedRetry"));
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent(
      redirectTo
    )}&userType=${effectiveUserType}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">{t("selectLoginType")}</p>
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label={t("loginTypeAria")}
        >
          <button
            type="button"
            role="radio"
            aria-checked={effectiveUserType === "viewer"}
            onClick={() => setUserType("viewer")}
            className={cn(
              "relative text-left rounded-xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              effectiveUserType === "viewer"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                effectiveUserType === "viewer"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 text-transparent"
              )}
              aria-hidden
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            <UserCircle2
              className={cn(
                "h-8 w-8 mb-2",
                effectiveUserType === "viewer" ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="block text-sm font-semibold text-foreground">{t("accountTypeViewer")}</span>
            <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
              {t("viewerDesc")}
            </span>
          </button>

          {allowProvider ? (
            <button
              type="button"
              role="radio"
              aria-checked={userType === "provider"}
              onClick={() => setUserType("provider")}
              className={cn(
                "relative text-left rounded-xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                userType === "provider"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                  userType === "provider"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-transparent"
                )}
                aria-hidden
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <Building2
                className={cn(
                  "h-8 w-8 mb-2",
                  userType === "provider" ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="block text-sm font-semibold text-foreground">{t("accountTypeProvider")}</span>
              <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
                {t("providerLoginDesc")}
              </span>
            </button>
          ) : (
            <div
              className="relative text-left rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 opacity-80"
              aria-disabled
              title={t("providerLoginDisabledTitle")}
            >
              <Building2 className="h-8 w-8 mb-2 text-muted-foreground" />
              <span className="block text-sm font-semibold text-muted-foreground">{t("accountTypeProvider")}</span>
              <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
                {t("providerLoginDisabledDesc")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Googleログイン */}
          <div className="space-y-5">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium border-input hover:bg-muted/50 transition-colors"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <Chrome className="h-4 w-4 mr-2" />
              {t("googleLogin")}
            </Button>
            <div className="relative my-5">
              <Separator />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs font-medium text-muted-foreground">
                {t("orEmailLogin")}
              </span>
            </div>
          </div>

          {/* メールログインフォーム */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                {t("email")} <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="login-email"
                  {...register("email")}
                  type="email"
                  placeholder="example@email.com"
                  autoComplete="email"
                  className="pl-10 h-11 rounded-lg"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                {t("password")} <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="login-password"
                  {...register("password")}
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="current-password"
                  className="pl-10 h-11 rounded-lg"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end -mt-1">
              <Link
                href="/auth/password-reset"
                className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            {globalError && (
              <div
                className="flex flex-col gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive"
                role="alert"
              >
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{globalError}</p>
                </div>
                {globalHint && (
                  <p className="text-sm text-muted-foreground pl-6">
                    {t("googleHintPrefix")}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="text-primary hover:underline font-medium mx-0.5"
                    >
                      {t("googleLogin")}
                    </button>
                    {t("googleHintMiddle")}
                    <Link href="/auth/password-reset" className="text-primary hover:underline font-medium mx-0.5">
                      {t("forgotPassword")}
                    </Link>
                    {t("googleHintSuffix")}
                  </p>
                )}
                {globalError.includes("サービス事業者として登録されています") && (
                  <p className="text-sm text-muted-foreground pl-6">
                    {t("providerAccountHint")}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-medium rounded-lg"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loggingIn")}
                </>
              ) : (
                t("submitLogin")
              )}
            </Button>
          </form>
    </div>
  );
}
