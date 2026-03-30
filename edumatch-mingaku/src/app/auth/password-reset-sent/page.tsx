import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";

export default function PasswordResetSentPage() {
  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/auth/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            ログインに戻る
          </Link>
        </Button>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-2xl font-bold mb-4">メールを送信しました</h1>

            <p className="text-muted-foreground mb-6">
              入力されたメールアドレスが登録済みの場合、
              <br />
              パスワードリセット用のリンクを送信しています。メールをご確認ください。
            </p>

            <div className="p-4 rounded-lg bg-muted/50 mb-6 text-left">
              <p className="text-sm text-muted-foreground">
                <strong>次のステップ:</strong>
                <br />
                1. メールボックスを確認してください
                <br />
                2. メール内の「パスワードをリセット」リンクをクリック
                <br />
                3. 新しいパスワードを設定
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
              <p className="text-sm text-amber-700">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
                <br />
                数分経っても届かない場合は、再度お試しください。
              </p>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href="/auth/password-reset">
                  <RefreshCw className="h-4 w-4" />
                  再送信する
                </Link>
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/contact">お問い合わせ</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
