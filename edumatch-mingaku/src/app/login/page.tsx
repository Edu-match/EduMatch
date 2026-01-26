"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mail, Lock, User, Building2, Loader2, AlertCircle, CheckCircle,
  BookOpen, School
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type UserType = "viewer" | "provider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";
  const message = searchParams.get("message");

  // ユーザータイプ（閲覧者/提供者）
  const [userType, setUserType] = useState<UserType>("viewer");

  // ログイン用
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 新規登録用
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerOrg, setRegisterOrg] = useState("");
  const [registerAgreed, setRegisterAgreed] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("メールアドレスまたはパスワードが正しくありません");
        } else if (error.message.includes("Email not confirmed")) {
          setError("メールアドレスの確認が完了していません。確認メールをご確認ください。");
        } else {
          setError(error.message);
        }
        setIsLoading(false);
        return;
      }

      // ログイン成功
      toast.success("ログインしました");
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      toast.error("ログインに失敗しました");
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!registerAgreed) {
      setError("利用規約とプライバシーポリシーに同意してください");
      setIsLoading(false);
      return;
    }

    if (registerPassword.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      setIsLoading(false);
      return;
    }

    // 企業/学校登録の場合は組織名必須
    if (userType === "provider" && !registerOrg) {
      setError("企業名・学校名を入力してください");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            name: registerName,
            organization: registerOrg || null,
            role: userType === "provider" ? "PROVIDER" : "VIEWER",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          setError("このメールアドレスは既に登録されています");
        } else {
          setError(error.message);
        }
        setIsLoading(false);
        return;
      }

      // 登録成功
      setSuccess("確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterName("");
      setRegisterOrg("");
      setRegisterAgreed(false);
    } catch {
      setError("会員登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-lg mx-auto">
        {/* ユーザータイプ選択 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-4">Edumatchへようこそ</h1>
          <p className="text-center text-muted-foreground mb-6">
            ご利用目的を選択してください
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setUserType("viewer")}
              className={`p-6 rounded-lg border-2 transition-all ${
                userType === "viewer"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full ${
                  userType === "viewer" ? "bg-primary/10" : "bg-muted"
                }`}>
                  <BookOpen className={`h-6 w-6 ${
                    userType === "viewer" ? "text-primary" : "text-muted-foreground"
                  }`} />
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${
                    userType === "viewer" ? "text-primary" : "text-foreground"
                  }`}>
                    閲覧者として利用
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    記事やサービスを閲覧
                  </p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setUserType("provider")}
              className={`p-6 rounded-lg border-2 transition-all ${
                userType === "provider"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full ${
                  userType === "provider" ? "bg-primary/10" : "bg-muted"
                }`}>
                  <School className={`h-6 w-6 ${
                    userType === "provider" ? "text-primary" : "text-muted-foreground"
                  }`} />
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${
                    userType === "provider" ? "text-primary" : "text-foreground"
                  }`}>
                    企業・学校として利用
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    サービスや記事を掲載
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {userType === "viewer" ? "閲覧者アカウント" : "企業・学校アカウント"}
            </CardTitle>
            <CardDescription>
              {userType === "viewer" 
                ? "教育サービスや記事を閲覧できます" 
                : "サービスや記事を掲載・管理できます"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* メッセージ表示 */}
            {message && (
              <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {message}
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* 成功メッセージ */}
            {success && (
              <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>

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
                  <div className="flex items-center justify-end text-sm">
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
              </TabsContent>

              {/* 新規登録タブ */}
              <TabsContent value="register" className="space-y-4 mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={userType === "provider" ? "担当者名" : "お名前"}
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  {/* 企業/学校の場合は組織名必須 */}
                  {userType === "provider" && (
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="企業名・学校名（必須）"
                        value={registerOrg}
                        onChange={(e) => setRegisterOrg(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  )}

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

                  {/* 閲覧者の場合のみ組織名は任意 */}
                  {userType === "viewer" && (
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
                  )}

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
                      userType === "provider" ? "企業・学校として登録" : "無料会員登録"
                    )}
                  </Button>
                </form>

                {userType === "provider" && (
                  <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                    <p className="font-medium mb-1">企業・学校アカウントの特典</p>
                    <ul className="text-xs space-y-1">
                      <li>• サービス・記事の掲載</li>
                      <li>• 閲覧数・問い合わせの分析</li>
                      <li>• 資料請求の管理</li>
                    </ul>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="container py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <Skeleton className="h-5 w-64 mx-auto mb-6" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
        <Card>
          <CardHeader className="text-center">
            <Skeleton className="h-6 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
