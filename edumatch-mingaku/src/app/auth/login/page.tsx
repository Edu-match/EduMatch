"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Lock, User, Building2, Chrome, Loader2 } from "lucide-react";
import { toast } from "sonner";

function AuthLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerOrg, setRegisterOrg] = useState("");
  const [registerAgreed, setRegisterAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 初期化時にエラーパラメータをチェック
  const errorFromUrl = searchParams.get("error");
  const initialError = errorFromUrl ? "認証に失敗しました。もう一度お試しください。" : null;
  const [error, setError] = useState<string | null>(initialError);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログインに失敗しました");
        setIsLoading(false);
        return;
      }

      // ログイン成功 - ページをリロードしてセッションを更新
      toast.success("ログインしました");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!registerAgreed) {
      setError("利用規約とプライバシーポリシーに同意してください");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName,
          organization: registerOrg || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "会員登録に失敗しました");
        setIsLoading(false);
        return;
      }

      // 登録成功
      toast.success("登録が完了しました");
      router.push("/auth/register-complete");
    } catch {
      setError("会員登録に失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = (isSignup: boolean = false) => {
    setIsLoading(true);
    setError(null);

    const redirectTo = isSignup ? "/auth/register-complete" : "/dashboard";
    window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent(redirectTo)}`;
  };

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Edumatchへようこそ</CardTitle>
            <p className="text-muted-foreground">
              教育の未来を見つける、つながる
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>

              {/* エラーメッセージ */}
              {error && (
                <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* ログインタブ */}
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="メールアドレス"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="パスワード"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span>ログイン状態を保持</span>
                    </label>
                    <Link
                      href="/auth/password-reset"
                      className="text-primary hover:underline"
                    >
                      パスワードを忘れた方
                    </Link>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ログイン中...
                      </>
                    ) : (
                      "ログイン"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <Separator className="my-4" />
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm text-muted-foreground">
                    または
                  </span>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleGoogleAuth(false)}
                    disabled={isLoading}
                  >
                    <Chrome className="h-4 w-4" />
                    Googleでログイン
                  </Button>
                </div>
              </TabsContent>

              {/* 新規登録タブ */}
              <TabsContent value="register" className="space-y-4 mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="お名前"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="メールアドレス"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="パスワード（8文字以上）"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={8}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="学校名・組織名（任意）"
                      value={registerOrg}
                      onChange={(e) => setRegisterOrg(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="text-sm">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded mt-1"
                        checked={registerAgreed}
                        onChange={(e) => setRegisterAgreed(e.target.checked)}
                        disabled={isLoading}
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
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登録中...
                      </>
                    ) : (
                      "無料会員登録"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <Separator className="my-4" />
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm text-muted-foreground">
                    または
                  </span>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleGoogleAuth(true)}
                    disabled={isLoading}
                  >
                    <Chrome className="h-4 w-4" />
                    Googleで登録
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuthLoginFallback() {
  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <Suspense fallback={<AuthLoginFallback />}>
      <AuthLoginForm />
    </Suspense>
  );
}
