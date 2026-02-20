import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, FileText } from "lucide-react";

const reports = [
  { id: 1, title: "数学テスト分析レポート", date: "2024-01-15", status: "完了" },
  { id: 2, title: "英語スピーキング評価", date: "2024-01-14", status: "進行中" },
  { id: 3, title: "学力推移レポート", date: "2024-01-13", status: "完了" },
];

export default function AssessmentPage() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">評価・分析</h1>
          <p className="text-muted-foreground">
            学習成果を可視化し、指導改善に活かします
          </p>
        </div>
        <Button>新規レポート</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              平均スコア
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">84.6点</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              改善率
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">+12%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              レポート数
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">24件</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            成績分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-video rounded-md overflow-hidden border">
            <Image
              src="https://placehold.co/800x400/e2e8f0/334155?text=Score+Distribution"
              alt="成績分布グラフ"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              推移分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-video rounded-md overflow-hidden border">
              <Image
                src="https://placehold.co/600x300/e2e8f0/334155?text=Trend+Analysis"
                alt="推移分析"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              レポート一覧
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{report.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.date).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <Badge
                  variant={report.status === "完了" ? "default" : "secondary"}
                >
                  {report.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
