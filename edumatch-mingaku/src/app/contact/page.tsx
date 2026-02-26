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
import { Mail, MessageCircle, Clock, HelpCircle } from "lucide-react";
import { OpenAiChatButton } from "@/components/ui/open-ai-chat-button";

const categories = [
  { value: "general", label: "一般的なお問い合わせ" },
  { value: "billing", label: "料金・請求について" },
  { value: "listing", label: "サービス掲載について" },
  { value: "partnership", label: "提携・パートナーシップ" },
  { value: "other", label: "その他" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">お問い合わせ</h1>
        <p className="text-muted-foreground">
          エデュマッチ運営へのお問い合わせはこちらから
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインフォーム */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>お問い合わせフォーム</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="山田太郎"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                お問い合わせ種別 <span className="text-red-500">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="お問い合わせ内容を詳しくご記入ください"
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="text-red-500">*</span> は必須項目です。
                お問い合わせ内容によっては、回答までにお時間をいただく場合がございます。
              </p>
            </div>

            <div className="form-actions">
              <Button className="w-full sm:w-auto sm:min-w-[200px]" size="lg" asChild>
                <Link href="/contact/complete">送信する</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                対応時間
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                平日 9:00 - 18:00（土日祝日を除く）
              </p>
              <p className="text-sm text-muted-foreground">
                ※ お問い合わせへの回答は、通常2〜3営業日以内にご連絡いたします。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                メールでのお問い合わせ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-primary">info@edu-match.com</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                AIチャットサポート
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                画面右下のAIナビゲーターからもお問い合わせいただけます（AIによる自動応答です）。
              </p>
              <OpenAiChatButton variant="outline" className="w-full">
                AIチャットを開く
              </OpenAiChatButton>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                よくある質問
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                お問い合わせの前に、よくある質問をご確認ください。
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/faq">FAQを見る</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
