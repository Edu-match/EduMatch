import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/services">
          <ArrowLeft className="h-4 w-4 mr-2" />
          サービス一覧に戻る
        </Link>
      </Button>

      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Scale className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">サービス比較</h1>
            <p className="text-muted-foreground mb-6">
              複数のサービスを比較する機能は現在準備中です。<br />
              しばらくお待ちください。
            </p>
            <Button asChild>
              <Link href="/services">サービス一覧を見る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
