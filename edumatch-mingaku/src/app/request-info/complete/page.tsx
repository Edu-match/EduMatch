import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Mail,
  Clock,
  ArrowRight,
  FileText,
  Home,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { getMaterialRequestById } from "@/app/_actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ requestId?: string; batch?: string }> };

export default async function RequestInfoCompletePage({ searchParams }: Props) {
  await requireAuth();
  const { requestId, batch } = await searchParams;
  const batchCount = batch ? parseInt(batch, 10) : 0;
  const isBatch = batchCount > 1;

  const request = requestId ? await getMaterialRequestById(requestId) : null;

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold mb-4">
              {isBatch
                ? `${batchCount}件の資料請求を送信しました`
                : "資料請求を送信しました"}
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              ご入力いただいた
              {request ? (
                <>メールアドレス（<strong>{request.delivery_email}</strong>）</>
              ) : (
                "メールアドレス"
              )}
              に、受付完了のご案内メールをお送りしています。
              <br />
              資料の送付はサービス提供元より、ご登録の送付先（メールまたはご住所）宛てに行われます。
            </p>

            {request && (
              <Card className="text-left mb-8">
                <CardContent className="p-6">
                  <h2 className="font-bold mb-4">送信内容の確認</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">受付番号</span>
                      <span className="font-mono text-sm">{request.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">サービス名</span>
                      <span>{request.service.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">送信日時</span>
                      <span>
                        {request.created_at.toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">送付先メール</span>
                      <span>{request.delivery_email}</span>
                    </div>
                    <div className="border-t pt-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">
                        サービス提供元には、資料請求の内容を自動でお知らせしています。
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-lg bg-muted/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <p className="font-medium">受付完了メールを送信しました</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  ご登録のメールアドレスに受付完了のご案内をお送りしています。届いていない場合は迷惑メールフォルダをご確認ください。
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-medium">資料の到着について</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  資料の送付はサービス提供元が行います。目安として1〜3営業日以内に届く場合が多く、お急ぎの場合は提供元へ直接お問い合わせください。
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isBatch && (
                <Button asChild size="lg" className="gap-2">
                  <Link href="/request-info/list">
                    <FileText className="h-4 w-4" />
                    資料請求リストを見る
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" className="gap-2">
                <Link href="/services">
                  他のサービスを見る
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
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
