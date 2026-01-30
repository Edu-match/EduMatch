"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, Loader2, Chrome, BookOpen, School } from "lucide-react";
import { RoleSelectionCard } from "./role-selection-card";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type UserType = "viewer" | "provider";

type Props = {
  onSuccess?: () => void;
  redirectTo?: string;
};

export function LoginForm({ onSuccess, redirectTo = "/dashboard" }: Props) {
  const [userType, setUserType] = useState<UserType | null>(null);
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
    if (!userType) {
      setGlobalError("アカウントタイプを選択してください");
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          userType,
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
    if (!userType) {
      setGlobalError("アカウントタイプを選択してください");
      return;
    }
    window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent(
      redirectTo
    )}&userType=${userType}`;
  };

  return (
    <div className="space-y-6">
      {/* ロール選択 */}
      {!userType && (
        <div>
          <p className="text-center font-medium mb-4">ご利用目的を選択してください</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RoleSelectionCard
              type="viewer"
              icon={BookOpen}
              title="閲覧者として利用"
              description="教育関係者やEdTechに関心のある方。最新情報の閲覧、サービス資料請求が可能です。"
              isSelected={userType === "viewer"}
              onClick={() => setUserType("viewer")}
            />
            <RoleSelectionCard
              type="provider"
              icon={School}
              title="投稿者として利用"
              description="企業・学校・団体向け。サービス・記事を投稿し、多くの教育関係者にアプローチできます。"
              isSelected={userType === "provider"}
              onClick={() => setUserType("provider")}
            />
          </div>
        </div>
      )}

      {userType && (
        <>
          {/* Googleログイン */}
          <div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <Chrome className="h-4 w-4 mr-2" />
              Googleでログイン
            </Button>
            <div className="relative my-6">
              <Separator />
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-muted-foreground">
                または
              </span>
            </div>
          </div>

          {/* メールログインフォーム */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="example@email.com"
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                パスワード <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="パスワードを入力"
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href="/auth/password-reset"
                className="text-sm text-primary hover:underline"
              >
                パスワードをお忘れですか？
              </Link>
            </div>

            {globalError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{globalError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
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

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setUserType(null)}
            disabled={isSubmitting}
          >
            ← アカウントタイプを変更
          </Button>
        </>
      )}
    </div>
  );
}
