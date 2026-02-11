"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User, Building2, Loader2, Chrome, BookOpen, School } from "lucide-react";
import { RoleSelectionCard } from "./role-selection-card";
import { signupSchema, signupProviderSchema, type SignupInput, type SignupProviderInput } from "@/lib/validations/auth";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type UserType = "viewer" | "provider";

type Props = {
  onSuccess?: () => void;
  redirectTo?: string;
};

export function SignupForm({ onSuccess, redirectTo = "/" }: Props) {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // react-hook-formのセットアップ - userTypeによってスキーマを切り替え
  const schema = userType === "provider" ? signupProviderSchema : signupSchema;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupInput | SignupProviderInput>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: SignupInput | SignupProviderInput) => {
    if (!userType) {
      setGlobalError("アカウントタイプを選択してください");
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          organization: "organization" in data ? data.organization : null,
          userType,
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
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
      }

      toast.success("登録が完了しました。次に住所などを登録してください。");
      const profileUrl = "/profile/register?first=1";
      window.location.href = profileUrl;
    } catch {
      setGlobalError("会員登録に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
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
          <p className="text-center font-medium mb-4">まず、ご利用目的を選択してください</p>
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
              onClick={handleGoogleSignup}
              disabled={isSubmitting}
            >
              <Chrome className="h-4 w-4 mr-2" />
              Googleで登録
            </Button>
            <div className="relative my-6">
              <Separator />
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-muted-foreground">
                または
              </span>
            </div>
          </div>

          {/* メール登録フォーム */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                表示名（会社名または活動名） <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("name")}
                  placeholder={
                    userType === "provider"
                      ? "例: 株式会社Edumatch / 教育太郎"
                      : "例: 山田太郎"
                  }
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {userType === "provider" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  企業名・学校名 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...register("organization")}
                    placeholder="例: 株式会社Edumatch / ○○高等学校"
                    className="pl-10"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.organization && (
                  <p className="text-sm text-destructive">
                    {errors.organization.message}
                  </p>
                )}
              </div>
            )}

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
                  placeholder="8文字以上、大文字・小文字・数字を含む"
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              {watch("password") && !errors.password && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  <p className="font-medium mb-1">✓ パスワードの条件を満たしています</p>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  {...register("agreedToTerms")}
                  type="checkbox"
                  className="rounded mt-1"
                  disabled={isSubmitting}
                />
                <span className="text-muted-foreground">
                  <Link href="/terms" className="text-primary hover:underline">
                    利用規約
                  </Link>
                  および
                  <Link href="/privacy" className="text-primary hover:underline">
                    プライバシーポリシー
                  </Link>
                  に同意します
                </span>
              </label>
              {errors.agreedToTerms && (
                <p className="text-sm text-destructive ml-6">
                  {errors.agreedToTerms.message}
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              💡 登録後、次のページで住所・連絡先・自己紹介などを登録できます（スキップ可）。
            </p>

            {globalError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{globalError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登録中...
                </>
              ) : userType === "provider" ? (
                "投稿者として登録"
              ) : (
                "無料会員登録"
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
