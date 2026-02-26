"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  Star,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import type { ServiceWithProvider } from "@/app/_actions/services";
import { serviceThumbnailPlaceholder } from "@/lib/utils";

type CompareClientPageProps = {
  initialServices: ServiceWithProvider[];
};

export default function CompareClientPage({ initialServices }: CompareClientPageProps) {
  // 初期選択は最初の3つ（あれば）
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialServices.slice(0, 3).map((s) => s.id)
  );

  const selectedServices = initialServices.filter((s) =>
    selectedIds.includes(s.id)
  );

  const unselectedServices = initialServices.filter(
    (s) => !selectedIds.includes(s.id)
  );

  const addService = (id: string) => {
    if (selectedIds.length < 5 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeService = (id: string) => {
    setSelectedIds(selectedIds.filter((sid) => sid !== id));
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/services">
          <ArrowLeft className="h-4 w-4 mr-2" />
          サービス一覧に戻る
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">サービス比較表</h1>
        <p className="text-muted-foreground">
          複数のサービスを比較して、最適なものを見つけましょう
        </p>
      </div>

      {/* サービス選択 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">比較するサービスを選択</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* 選択済みサービス */}
            <div className="flex flex-wrap gap-2">
              {selectedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background"
                >
                  <span className="text-sm font-medium">{service.title}</span>
                  <button
                    onClick={() => removeService(service.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* 追加プルダウン */}
            {selectedIds.length < 5 && (
              <div className="flex items-center gap-2">
                <Select onValueChange={addService}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="サービスを追加..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unselectedServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.title}
                      </SelectItem>
                    ))}
                    {unselectedServices.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        選択可能なサービスはありません
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  (あと {5 - selectedIds.length} つ選択可能)
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {selectedIds.length}/5 サービスを選択中
          </p>
        </CardContent>
      </Card>

      {/* エクスポートボタン */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          PDFで出力
        </Button>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Excelで出力
        </Button>
      </div>

      {/* 比較表 */}
      <div className="overflow-x-auto">
        <Card>
          <CardContent className="p-0">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-medium text-muted-foreground w-40">
                    項目
                  </th>
                  {selectedServices.map((service) => (
                    <th key={service.id} className="p-4 text-center min-w-[180px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-[100px] h-[60px] rounded overflow-hidden">
                            <Image
                              src={service.thumbnail_url || serviceThumbnailPlaceholder(service.title, 100, 60)}
                              alt={service.title}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        <span className="font-bold line-clamp-2 h-[3rem] flex items-center">
                          {service.title}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {service.category}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 基本情報 */}
                <tr className="border-b bg-muted/30">
                  <td className="p-4 font-medium" colSpan={selectedServices.length + 1}>
                    基本情報
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 text-muted-foreground">提供者</td>
                  {selectedServices.map((service) => (
                    <td key={service.id} className="p-4 text-center text-sm">
                      {service.provider?.name || "提供者"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 text-muted-foreground">価格</td>
                  {selectedServices.map((service) => (
                    <td
                      key={service.id}
                      className="p-4 text-center font-semibold text-primary"
                    >
                      {service.price_info}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 text-muted-foreground">概要</td>
                  {selectedServices.map((service) => (
                    <td key={service.id} className="p-4 text-center text-sm">
                      <p className="line-clamp-3 text-muted-foreground">
                        {service.description}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* アクション */}
                <tr>
                  <td className="p-4"></td>
                  {selectedServices.map((service) => (
                    <td key={service.id} className="p-4 text-center">
                      <div className="space-y-2">
                        <Button asChild className="w-full">
                          <Link href={`/services/${service.id}`}>
                            詳細を見る
                          </Link>
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/request-info">資料請求</Link>
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {selectedServices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            比較するサービスを選択してください
          </p>
          <Button asChild>
            <Link href="/services">サービスを探す</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
