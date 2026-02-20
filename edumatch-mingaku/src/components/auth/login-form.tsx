"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, Loader2, Chrome, AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

/** ログインは閲覧者のみ。投稿者選択はオフのため常に viewer で送信 */
const LOGIN_USER_TYPE = "viewer" as const;

type Props = {
  onSuccess?: () => void;
  redirectTo?: string;
};

export function LoginForm({ onSuccess, redirectTo = "/" }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          userType: LOGIN_USER_TYPE,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setGlobalError(result.error || "ログインに失敗しました");
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
      setGlobalError("ログインに失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent(
      redirectTo
    )}&userType=${LOGIN_USER_TYPE}`;
  };

  return (
    <div className="space-y-6">
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
              Googleでログイン
            </Button>
            <div className="relative my-5">
              <Separator />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs font-medium text-muted-foreground">
                またはメールでログイン
              </span>
            </div>
          </div>

          {/* メールログインフォーム */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                メールアドレス <span className="text-destructive">*</span>
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
                パスワード <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="login-password"
                  {...register("password")}
                  type="password"
                  placeholder="パスワードを入力"
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
                パスワードをお忘れですか？
              </Link>
            </div>

            {globalError && (
              <div
                className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{globalError}</p>
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
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
    </div>
  );
}
