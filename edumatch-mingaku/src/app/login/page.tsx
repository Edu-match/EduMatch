"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mail, Lock, User, Building2, Loader2, AlertCircle, CheckCircle,
  BookOpen, School, Chrome, MapPin
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getPasswordErrors } from "@/lib/password";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type UserType = "viewer" | "provider";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";
  const message = searchParams.get("message");

  // ユーザータイプ（閲覧者/提供者）- 初期状態は未選択
  const [userType, setUserType] = useState<UserType | null>(null);

  // ログイン用
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 新規登録用
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerOrg, setRegisterOrg] = useState("");
  const [registerAgreed, setRegisterAgreed] = useState(false);
  const [registerSkipAddress, setRegisterSkipAddress] = useState(true);
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPostalCode, setRegisterPostalCode] = useState("");
  const [registerPrefecture, setRegisterPrefecture] = useState("");
  const [registerCity, setRegisterCity] = useState("");
  const [registerAddress, setRegisterAddress] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // URLパラメータからエラーを取得
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_error") {
      setError("Googleログインに失敗しました。もう一度お試しください。");
    } else if (errorParam === "role_mismatch") {
      const expected = searchParams.get("expected");
      const actual = searchParams.get("actual");
      if (expected === "PROVIDER" && actual === "VIEWER") {
        setError("このアカウントは閲覧者アカウントです。閲覧者として利用を選択してください。");
      } else if (expected === "VIEWER" && actual === "PROVIDER") {
        setError("このアカウントは投稿者アカウントです。投稿者として利用を選択してください。");
      } else {
        setError("アカウントタイプが一致しません。正しいアカウントタイプでログインしてください。");
      }
    } else if (errorParam === "profile_creation_failed") {
      setError("プロフィールの作成に失敗しました。もう一度お試しください。");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userType) {
      setError("アカウントタイプを選択してください");
      return;
    }

    setIsLoading(true);
    setError(null);

    const loginPwErrors = getPasswordErrors(loginPassword);
    if (loginPwErrors.length > 0) {
      setError("パスワードが間違っています。");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログインに失敗しました");
        setIsLoading(false);
        return;
      }

      // ログイン成功：セッションをクライアントに設定
      if (data.session) {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // フルリロードでヘッダーの認証表示を更新
      toast.success("ログインしました");
      window.location.href = redirectTo;
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      toast.error("ログインに失敗しました");
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userType) {
      setError("アカウントタイプを選択してください");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!registerAgreed) {
      setError("利用規約とプライバシーポリシーに同意してください");
      setIsLoading(false);
      return;
    }

    const signupPwErrors = getPasswordErrors(registerPassword);
    if (signupPwErrors.length > 0) {
      setError("パスワードが間違っています。");
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
      const body: Record<string, unknown> = {
        email: registerEmail,
        password: registerPassword,
        name: registerName,
        organization: registerOrg || null,
        userType,
      };
      if (!registerSkipAddress) {
        body.phone = registerPhone || null;
        body.postal_code = registerPostalCode || null;
        body.prefecture = registerPrefecture || null;
        body.city = registerCity || null;
        body.address = registerAddress || null;
      }
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "会員登録に失敗しました");
        setIsLoading(false);
        return;
      }

      // 登録成功 → ログイン後プロフィール設定へ（メール登録はここでセッションが付かないため一旦ログインへ）
      toast.success("登録が完了しました。ログインしてプロフィール（名前・住所など）を設定してください。");
      router.push("/login?message=登録が完了しました。ログインしてプロフィール（名前・住所など）を設定してください。&redirect_to=" + encodeURIComponent("/profile/register?first=1"));
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
                    投稿者として利用
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ユーザータイプが選択された場合のみフォームを表示 */}
        {userType && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {userType === "viewer" ? "閲覧者として利用" : "投稿者として利用"}
            </CardTitle>
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
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-line">{error}</span>
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

                <div className="relative">
                  <Separator className="my-4" />
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm text-muted-foreground">
                    または
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    if (!userType) {
                      setError("アカウントタイプを選択してください");
                      return;
                    }
                    window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent(redirectTo)}&userType=${userType}`;
                  }}
                  disabled={isLoading}
                >
                  <Chrome className="h-4 w-4" />
                  Googleでログイン
                </Button>
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
                  <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">パスワードの条件</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>8文字以上</li>
                      <li>大文字を含む</li>
                      <li>小文字を含む</li>
                      <li>数字を含む</li>
                    </ul>
                  </div>

                  {/* 住所・連絡先（任意） */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      住所・連絡先（任意）
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={registerSkipAddress ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRegisterSkipAddress(true)}
                        disabled={isLoading}
                      >
                        今はスキップ
                      </Button>
                      <Button
                        type="button"
                        variant={!registerSkipAddress ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRegisterSkipAddress(false)}
                        disabled={isLoading}
                      >
                        住所を登録する
                      </Button>
                    </div>
                    {!registerSkipAddress && (
                      <div className="space-y-3 pt-2 border-t">
                        <Input
                          placeholder="電話番号"
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          disabled={isLoading}
                          className="pl-3"
                        />
                        <Input
                          placeholder="郵便番号（例: 100-0001）"
                          value={registerPostalCode}
                          onChange={(e) => setRegisterPostalCode(e.target.value)}
                          disabled={isLoading}
                          className="pl-3"
                        />
                        <Select value={registerPrefecture} onValueChange={setRegisterPrefecture} disabled={isLoading}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="都道府県を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {PREFECTURES.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="市区町村"
                          value={registerCity}
                          onChange={(e) => setRegisterCity(e.target.value)}
                          disabled={isLoading}
                          className="pl-3"
                        />
                        <Input
                          placeholder="町名・番地・建物名"
                          value={registerAddress}
                          onChange={(e) => setRegisterAddress(e.target.value)}
                          disabled={isLoading}
                          className="pl-3"
                        />
                      </div>
                    )}
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

                <div className="relative">
                  <Separator className="my-4" />
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm text-muted-foreground">
                    または
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    if (!userType) {
                      setError("アカウントタイプを選択してください");
                      return;
                    }
                    window.location.href = `/api/auth/google?redirect_to=${encodeURIComponent(redirectTo)}&userType=${userType}`;
                  }}
                  disabled={isLoading}
                >
                  <Chrome className="h-4 w-4" />
                  Googleで登録
                </Button>

              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )}
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
