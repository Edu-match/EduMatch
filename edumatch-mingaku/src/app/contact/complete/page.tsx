import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Clock, Home, HelpCircle } from "lucide-react";

export default function ContactCompletePage() {
  const inquiryDetails = {
    inquiryId: "INQ-2024011502",
    category: "一般的なお問い合わせ",
    date: "2024年1月15日 14:30",
    email: "yamada@example.com",
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold mb-4">
              お問い合わせを受け付けました
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              担当者より、ご登録のメールアドレスに
              <br />
              回答をお送りいたします。
            </p>

            {/* 問い合わせ内容の確認 */}
            <Card className="text-left mb-8">
              <CardContent className="p-6">
                <h2 className="font-bold mb-4">お問い合わせ内容</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">問い合わせ番号</span>
                    <span className="font-mono font-bold text-primary">
                      {inquiryDetails.inquiryId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">種別</span>
                    <span>{inquiryDetails.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">受付日時</span>
                    <span>{inquiryDetails.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">回答先</span>
                    <span>{inquiryDetails.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 注意事項 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-lg bg-muted/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-medium">回答までの目安</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  通常2〜3営業日以内にご回答いたします。お急ぎの場合はお電話でお問い合わせください。
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <p className="font-medium">確認メール</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  受付確認メールをお送りしました。届かない場合は迷惑メールフォルダをご確認ください。
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-8 text-left">
              <p className="text-sm text-amber-700">
                <strong>お問い合わせ番号</strong>は、追加のお問い合わせや進捗確認の際に必要となります。
                このページをブックマークするか、番号をお控えください。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  トップページへ
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/faq">
                  <HelpCircle className="h-4 w-4" />
                  よくある質問を見る
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
