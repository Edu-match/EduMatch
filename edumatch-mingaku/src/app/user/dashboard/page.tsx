import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  DollarSign,
  Eye,
  TrendingUp,
  Calendar,
  Edit,
  Plus,
  ArrowRight,
  Settings,
  CreditCard,
} from "lucide-react";

const stats = [
  { label: "公開記事", value: 12, icon: FileText },
  { label: "総閲覧数", value: "5,234", icon: Eye },
  { label: "今月の収益", value: "¥45,600", icon: DollarSign },
  { label: "前月比", value: "+18%", icon: TrendingUp },
];

const articles = [
  {
    id: 1,
    title: "EdTechツール選びの完全ガイド",
    status: "published",
    views: 1234,
    earnings: "¥12,400",
    date: "2024-01-15",
  },
  {
    id: 2,
    title: "学校DX推進のためのステップ",
    status: "published",
    views: 856,
    earnings: "¥8,560",
    date: "2024-01-10",
  },
  {
    id: 3,
    title: "オンライン授業の効果的な進め方",
    status: "draft",
    views: 0,
    earnings: "¥0",
    date: "2024-01-14",
  },
  {
    id: 4,
    title: "データドリブンな教育改善の実践",
    status: "review",
    views: 0,
    earnings: "¥0",
    date: "2024-01-13",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "published":
      return <Badge className="bg-green-500">公開中</Badge>;
    case "draft":
      return <Badge variant="secondary">下書き</Badge>;
    case "review":
      return <Badge className="bg-amber-500">審査中</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const earningsHistory = [
  { month: "2024年1月", amount: "¥45,600", status: "pending" },
  { month: "2023年12月", amount: "¥38,200", status: "paid" },
  { month: "2023年11月", amount: "¥41,800", status: "paid" },
];

export default function UserDashboardPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">ユーザーダッシュボード</h1>
            <p className="text-muted-foreground">山田太郎さん</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/profile/register">
                <Settings className="h-4 w-4 mr-2" />
                プロフィール編集
              </Link>
            </Button>
            <Button asChild>
              <Link href="/articles/new">
                <Plus className="h-4 w-4 mr-2" />
                記事を書く
              </Link>
            </Button>
          </div>
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 記事管理 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                記事一覧
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/user/articles">
                  すべて見る
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium line-clamp-1">
                          {article.title}
                        </span>
                        {getStatusBadge(article.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.views.toLocaleString()} PV
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(article.date).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-primary">{article.earnings}</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 収益サマリー */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                収益管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {earningsHistory.map((item) => (
                  <div
                    key={item.month}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{item.month}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.status === "paid" ? "振込済" : "振込予定"}
                      </p>
                    </div>
                    <span className="font-bold">{item.amount}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/user/earnings">
                  収益詳細を見る
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* プラン情報 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                ご利用プラン
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Badge>クリエイタープラン</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  記事投稿・収益化機能が有効です
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">収益分配率</span>
                  <span className="font-medium">70%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">月額</span>
                  <span className="font-medium">¥29,800</span>
                </div>
              </div>
              <Button className="w-full mt-4" asChild>
                <Link href="/plans">プランを変更</Link>
              </Button>
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/articles/new">
                  <Plus className="h-4 w-4 mr-2" />
                  新しい記事を書く
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/user/analytics">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  アクセス解析
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
