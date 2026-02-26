import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "AIチャットの利用回数と回復について | エデュマッチ",
  description: "AIナビゲーター（チャット）の利用回数制限と、回数が回復する仕組みについて説明します。",
};

export default function ChatUsageLimitPage() {
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
        <h1 className="text-2xl font-bold mb-2">AIチャットの利用回数と回復について</h1>
        <p className="text-sm text-muted-foreground">
          利用回数の数え方と、いつ回復するかをご説明します。
        </p>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="prose prose-sm max-w-none text-foreground space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-2">利用回数について</h2>
              <p>
                AIナビゲーター（チャット）は、会員の方が公平にご利用いただけるよう、<strong>直近24時間あたり30回まで</strong>のご利用としています。
                メッセージを1回送信するごとに1回とカウントされます。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">回復の仕組み（0にリセットされるタイミング）</h2>
              <p>
                利用回数は「24時間のスライディングウィンドウ」で計算しています。つまり、<strong>いまから24時間より前に行った利用はカウントから外れます</strong>。
              </p>
              <p>
                例えば、昨日の同じ時刻に1回利用している場合、今日のその時刻を過ぎると、その1回分が枠から外れ、あと1回利用できる状態になります。30回すべて使い切った場合は、<strong>いちばん古い利用から24時間経過したタイミングで、その1回分が回復</strong>します。
              </p>
              <p>
                チャット画面の上部には「あと○時間○分で0にリセット」または「○/30 回」と表示されています。ここで、次に1回分がいつ回復するか（または、いつまでに使うと30回の枠がリセットされるか）を確認できます。「詳細を見る」からこのページをご覧いただけます。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">ご利用のヒント</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>1回のやりとりで複数メッセージを送ると、その分だけ回数が増えます。</li>
                <li>質問をまとめてから送信すると、回数を節約しやすくなります。</li>
                <li>回数が足りない場合は、表示されている「リセット」時刻を過ぎると、古い利用から順に枠が空いていきます。</li>
              </ul>
            </section>
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
