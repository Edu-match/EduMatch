import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageSquare,
  FileText,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings,
} from "lucide-react";

const stats = [
  { label: "マッチング依頼", value: 12, change: "+3", icon: Users },
  { label: "進行中の案件", value: 5, change: "+1", icon: MessageSquare },
  { label: "今月の成約", value: 3, change: "+2", icon: CheckCircle2 },
  { label: "閲覧数", value: 245, change: "+18%", icon: TrendingUp },
];

const matchings = [
  {
    id: 1,
    talentName: "山田太郎",
    title: "EdTechコンサルタント",
    status: "negotiating",
    amount: "¥150,000",
    date: "2024-01-15",
    message: "導入支援の詳細についてご相談したく...",
  },
  {
    id: 2,
    talentName: "佐藤花子",
    title: "プログラミング教育講師",
    status: "completed",
    amount: "¥120,000",
    date: "2024-01-10",
    message: "ワークショップの実施ありがとうございました",
  },
  {
    id: 3,
    talentName: "鈴木美咲",
    title: "オンライン教育専門家",
    status: "pending",
    amount: "¥100,000",
    date: "2024-01-14",
    message: "オンライン授業の改善について",
  },
  {
    id: 4,
    talentName: "田中一郎",
    title: "学習分析エンジニア",
    status: "negotiating",
    amount: "¥200,000",
    date: "2024-01-12",
    message: "ダッシュボード構築の見積もり",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500">完了</Badge>;
    case "negotiating":
      return <Badge className="bg-blue-500">交渉中</Badge>;
    case "pending":
      return <Badge variant="secondary">依頼中</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function CompanyDashboardPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">企業ダッシュボード</h1>
            <p className="text-muted-foreground">
              株式会社○○教育ソリューションズ
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/company/settings">
              <Settings className="h-4 w-4 mr-2" />
              設定
            </Link>
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  {stat.change} 前月比
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* マッチング管理 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                マッチング管理
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/company/matchings">
                  すべて見る
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matchings.map((matching) => (
                  <div
                    key={matching.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{matching.talentName}</span>
                        {getStatusBadge(matching.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {matching.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {matching.message}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-primary">{matching.amount}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(matching.date).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 通知 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                対応が必要な案件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm font-medium text-amber-800">
                    山田太郎さんからの返信待ち
                  </p>
                  <p className="text-xs text-amber-600 mt-1">3日前に送信</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">
                    新しいマッチング依頼があります
                  </p>
                  <p className="text-xs text-blue-600 mt-1">本日</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/talent">
                  <Users className="h-4 w-4 mr-2" />
                  人材を探す
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/company/posting">
                  <FileText className="h-4 w-4 mr-2" />
                  案件を投稿する
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/company/messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  メッセージ
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* 今月の支払い */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">今月の支払い</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">確定済み</span>
                  <span className="font-bold">¥270,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">交渉中</span>
                  <span>¥350,000</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-medium">合計（見込み）</span>
                  <span className="font-bold text-primary">¥620,000</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/company/billing">支払い履歴</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
