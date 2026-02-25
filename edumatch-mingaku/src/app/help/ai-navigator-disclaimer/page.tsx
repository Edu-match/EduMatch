import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "AIナビゲーターご利用上の留意点 | エデュマッチ",
  description: "本サイトのAIナビゲーターのご利用にあたっての留意事項をご確認ください。",
};

export default function AiNavigatorDisclaimerPage() {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/help" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            ヘルプに戻る
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">AIナビゲーターご利用上の留意点</h1>
        <p className="text-sm text-muted-foreground">
          ご利用の前に必ずお読みください。
        </p>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="prose prose-sm max-w-none text-foreground space-y-4">
            <p>
              本サイトのAIナビゲーターは、エデュマッチが提供する教育サービス・ICTツール等の情報検索・相談支援の補助機能です。
            </p>
            <p>
              本AIによる応答は、教育サービス選びや情報整理の参考を目的に自動生成されたものであり、内容の正確性・最新性・完全性を保証するものではありません。回答内容に基づく最終的な判断（資料請求・契約・導入等）は、必ず各サービス提供元の公式情報・担当者への確認を行ってください。
            </p>
            <p>
              本AIの回答や解析内容により利用者または第三者に発生した損害について、当サイトおよび運営者は一切責任を負いません。本AIはすべての利用ケースに対応するものではなく、AIが誤った情報を生成する可能性（いわゆる「ハルシネーション」）をご了承ください。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/help">ヘルプ一覧へ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
