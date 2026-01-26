"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowLeft, HelpCircle } from "lucide-react";

const services = [
  { id: "1", name: "ClassTech Pro", category: "学習管理" },
  { id: "2", name: "EduCollabo", category: "コミュニケーション" },
  { id: "3", name: "SmartAssess", category: "評価・分析" },
  { id: "4", name: "LearnSpace", category: "学習環境" },
  { id: "5", name: "TeamEdu", category: "協働学習" },
];

const ratingLabels = [
  "選択してください",
  "非常に不満",
  "不満",
  "普通",
  "満足",
  "非常に満足",
];

export default function ReviewWritePage() {
  const [selectedService, setSelectedService] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [organization, setOrganization] = useState("");

  const maxContentLength = 2000;

  const service = services.find((s) => s.id === selectedService);

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/reviews">
          <ArrowLeft className="h-4 w-4 mr-2" />
          レビュー一覧に戻る
        </Link>
      </Button>

      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-6 w-6" />
              レビューを投稿
            </CardTitle>
            <p className="text-muted-foreground">
              あなたの経験を共有して、他の教育関係者の参考にしましょう
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* サービス選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                レビュー対象サービス <span className="text-red-500">*</span>
              </label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="サービスを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}（{service.category}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {service && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{service.category}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {service.name}
                  </span>
                </div>
              )}
            </div>

            {/* 評価 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                総合評価 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-muted text-muted"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {ratingLabels[hoverRating || rating]}
                </span>
              </div>
            </div>

            {/* タイトル */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                レビュータイトル <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="このサービスを一言で表すと？"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/100文字
              </p>
            </div>

            {/* レビュー本文 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                レビュー内容 <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="このサービスを使った感想を詳しく教えてください。導入の経緯、使いやすさ、効果などを具体的に書くと参考になります。"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={maxContentLength}
              />
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/{maxContentLength}文字
              </p>
            </div>

            {/* 良い点・改善点 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">良い点</label>
                <Textarea
                  placeholder="このサービスの良い点を教えてください"
                  rows={4}
                  value={pros}
                  onChange={(e) => setPros(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">改善してほしい点</label>
                <Textarea
                  placeholder="改善を期待する点があれば教えてください"
                  rows={4}
                  value={cons}
                  onChange={(e) => setCons(e.target.value)}
                />
              </div>
            </div>

            {/* 所属情報 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                所属（任意・公開されます）
              </label>
              <Input
                placeholder="例：○○県立△△中学校"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                学校名などを入力すると、同じ環境の方の参考になります
              </p>
            </div>

            {/* 注意事項 */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">投稿時の注意事項</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>実際に使用した経験に基づいてレビューしてください</li>
                    <li>個人情報や機密情報は含めないでください</li>
                    <li>投稿後の編集・削除はマイページから可能です</li>
                    <li>不適切な内容は掲載を見合わせる場合があります</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!selectedService || rating === 0 || !title || !content}
              asChild
            >
              <Link href="/reviews/complete">レビューを投稿する</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
