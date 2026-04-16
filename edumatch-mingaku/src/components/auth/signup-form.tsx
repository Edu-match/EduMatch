"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, Loader2, Chrome, AlertCircle, Building2, UserCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type Props = {
  onSuccess?: () => void;
  redirectTo?: string;
};

/** 新規登録時にユーザータイプを選択可能にする */
export function SignupForm({ onSuccess, redirectTo = "/" }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [userType, setUserType] = useState<"viewer" | "provider">("viewer");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: SignupInput) => {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          userType: userType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setGlobalError(result.error || "会員登録に失敗しました");
        setIsSubmitting(false);
        return;
      }

      // セッションを設定してプロフィール登録ページへ
      if (result.session) {
        const supabase = createSupabaseBrowserClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
        
        if (sessionError) {
          console.error("Session set error:", sessionError);
          setGlobalError("ログインセッションの設定に失敗しました。もう一度ログインしてください。");
          setIsSubmitting(false);
          return;
        }

        // セッションが正しく設定されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(
        userType === "provider"
          ? "事業者として登録しました。続けて事業者プロフィールを入力してください。"
          : "一般利用として登録しました。続けてプロフィールを入力してください。"
      );
      
      // クライアントサイドでリダイレクト（セッションCookieが確実に設定されるように）
      const profileUrl = "/profile/register?first=1";
      window.location.href = profileUrl;
    } catch {
      setGlobalError("会員登録に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent(
      redirectTo
    )}&userType=${userType}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">登録の種類を選んでください</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            あとから変更できます。選んだ種類に合わせてプロフィール入力項目が切り替わります。
          </p>
        </div>
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="新規登録の種類"
        >
          <button
            type="button"
            role="radio"
            aria-checked={userType === "viewer"}
            onClick={() => setUserType("viewer")}
            className={cn(
              "relative text-left rounded-xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              userType === "viewer"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                userType === "viewer"
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
                userType === "viewer" ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="block text-sm font-semibold text-foreground">一般利用</span>
            <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
              個人・保護者・学生など。サービスの検索・比較・資料請求に利用します。
            </span>
          </button>
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
            <span className="block text-sm font-semibold text-foreground">事業者・団体</span>
            <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
              EdTech事業者や教育関連団体。サービス掲載・投稿・問い合わせ受付に利用します。
            </span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          選択中:{" "}
          <span className="font-medium text-foreground">
            {userType === "provider" ? "事業者・団体（企業向けプロフィール）" : "一般利用"}
          </span>
        </p>
      </div>

      {/* Google登録 */}
      <div className="space-y-5">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 font-medium border-input hover:bg-muted/50 transition-colors"
          onClick={handleGoogleSignup}
          disabled={isSubmitting}
        >
          <Chrome className="h-4 w-4 mr-2" />
          Googleで登録
        </Button>
        <div className="relative my-5">
          <Separator />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs font-medium text-muted-foreground">
            またはメールで登録
          </span>
        </div>
      </div>

      {/* メール登録フォーム（名前・所属は登録後のプロフィール設定で入力） */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                メールアドレス <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="signup-email"
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
              <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                パスワード <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="signup-password"
                  {...register("password")}
                  type="password"
                  placeholder="8文字以上、大文字・小文字・数字を含む"
                  autoComplete="new-password"
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
              {watch("password") && !errors.password && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                  <p className="font-medium">✓ パスワードの条件を満たしています</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer text-sm">
                <input
                  {...register("agreedToTerms")}
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.agreedToTerms}
                />
                <span className="text-muted-foreground leading-relaxed">
                  <Link
                    href="/terms"
                    className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  >
                    利用規約
                  </Link>
                  および
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  >
                    プライバシーポリシー
                  </Link>
                  に同意します
                </span>
              </label>
              {errors.agreedToTerms && (
                <p className="text-sm text-destructive pl-7" role="alert">
                  {errors.agreedToTerms.message}
                </p>
              )}
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
                  登録中...
                </>
              ) : (
                "無料会員登録"
              )}
            </Button>
          </form>
    </div>
  );
}
