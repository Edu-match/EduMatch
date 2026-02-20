import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  User,
  Sparkles,
  BookOpen,
} from "lucide-react";

const nextSteps = [
  {
    icon: Mail,
    title: "メールを確認",
    description: "確認メールを送信しました。メール内のリンクをクリックして認証を完了してください。",
  },
  {
    icon: User,
    title: "プロフィールを設定（名前・住所など）",
    description: "お名前・電話番号・住所（資料請求の送付先）などを登録すると、資料請求がスムーズになります。関心カテゴリも設定できます。",
  },
  {
    icon: Sparkles,
    title: "コンテンツを探索",
    description: "会員限定記事やサービス情報など、さまざまなコンテンツをお楽しみください。",
  },
];

export default function RegisterCompletePage() {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold mb-4">会員登録が完了しました</h1>

            <p className="text-lg text-muted-foreground mb-2">
              エデュマッチへようこそ！
            </p>
            <p className="text-muted-foreground mb-8">
              ご登録いただいたメールアドレスに確認メールを送信しました。
              <br />
              メール内のリンクをクリックして、認証を完了してください。
            </p>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-8">
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <Mail className="h-5 w-5" />
                <span className="font-medium">
                  確認メールが届かない場合
                </span>
              </div>
              <p className="text-sm text-amber-600 mt-2">
                迷惑メールフォルダをご確認ください。数分経っても届かない場合は、
                <Link href="/contact" className="underline">
                  お問い合わせ
                </Link>
                ください。
              </p>
            </div>

            <div className="border-t pt-8 mb-8">
              <h2 className="text-xl font-bold mb-6">次のステップ</h2>
              <div className="space-y-4">
                {nextSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 text-left"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-primary" />
                          <p className="font-medium">{step.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/profile/register">
                  プロフィールを設定する（名前・住所など）
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/">
                  <BookOpen className="h-4 w-4" />
                  トップページへ
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
