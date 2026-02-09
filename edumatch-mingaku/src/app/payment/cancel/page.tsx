import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, HelpCircle, MessageCircle } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
              <XCircle className="h-10 w-10 text-orange-600" />
            </div>

            <h1 className="text-3xl font-bold mb-4">
              お支払いがキャンセルされました
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              決済処理はキャンセルされました。料金は発生していません。
            </p>

            {/* ヘルプ情報 */}
            <Card className="mb-8 border-muted">
              <CardContent className="p-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-bold">お困りですか？</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>
                    決済に問題がある場合は、別のカードをお試しください。
                  </li>
                  <li>
                    ご質問がございましたら、お気軽にお問い合わせください。
                  </li>
                  <li>
                    いつでもプラン選択ページから再度お申し込みいただけます。
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/plans">
                  <ArrowLeft className="h-4 w-4" />
                  プラン選択に戻る
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/contact">
                  <MessageCircle className="h-4 w-4" />
                  お問い合わせ
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
