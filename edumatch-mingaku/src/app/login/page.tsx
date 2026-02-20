import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";

function LoginPageContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block mb-6 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
          >
            <span className="text-4xl font-bold text-primary tracking-tight">エデュマッチ</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2 text-foreground">教育の未来をつなぐ</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            EdTechサービスと教育現場をマッチング
          </p>
        </div>

        <Card className="border shadow-lg rounded-xl overflow-hidden bg-card">
          <CardHeader className="space-y-1 pb-2 pt-6 px-6">
            <CardTitle className="text-center text-xl font-semibold">
              ログイン・新規登録
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 mb-6 rounded-lg bg-muted/60">
                <TabsTrigger
                  value="login"
                  className="rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  ログイン
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  新規登録
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 focus-visible:outline-none">
                <LoginForm />
              </TabsContent>

              <TabsContent value="signup" className="mt-0 focus-visible:outline-none">
                <SignupForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6 leading-relaxed">
          利用登録で、EdTechの検索・比較・資料請求が可能になります
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="w-full max-w-2xl h-[600px]" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
