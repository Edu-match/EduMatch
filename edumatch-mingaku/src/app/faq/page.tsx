"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  HelpCircle,
  CreditCard,
  User,
  FileText,
  Settings,
  MessageCircle,
} from "lucide-react";

const categories = [
  {
    id: "service",
    title: "サービスについて",
    icon: HelpCircle,
    faqs: [
      {
        question: "エデュマッチとは何ですか？",
        answer:
          "エデュマッチは、教育現場とEdTechをつなぐマッチングプラットフォームです。最新の教育事例やEdTechツールを検索・比較し、最適なサービスを見つけることができます。",
      },
      {
        question: "サービスは無料で利用できますか？",
        answer:
          "基本的な機能（記事閲覧、サービス検索など）は無料でご利用いただけます。会員限定コンテンツや一部の高度な機能は、有料プランでご利用いただけます。",
      },
      {
        question: "どのような情報が掲載されていますか？",
        answer:
          "EdTechサービスの紹介、導入事例、教育ICTに関する最新記事、セミナー・イベント情報などを掲載しています。教育現場の課題解決に役立つ情報を幅広く提供しています。",
      },
    ],
  },
  {
    id: "account",
    title: "アカウントについて",
    icon: User,
    faqs: [
      {
        question: "会員登録は必要ですか？",
        answer:
          "記事の閲覧は会員登録なしで可能です。お気に入り登録やブックマーク機能、詳細情報の閲覧には会員登録（無料）が必要です。",
      },
      {
        question: "パスワードを忘れてしまいました",
        answer:
          "ログインページの「パスワードをお忘れの方」からパスワードリセットが可能です。登録メールアドレスにリセット用リンクをお送りします。",
      },
      {
        question: "退会したい場合はどうすればいいですか？",
        answer:
          "マイページの「アカウント設定」から退会手続きが可能です。退会後はデータが削除され、復元できませんのでご注意ください。",
      },
    ],
  },
  {
    id: "billing",
    title: "料金・お支払いについて",
    icon: CreditCard,
    faqs: [
      {
        question: "料金プランについて教えてください",
        answer:
          "フリープラン（無料）、スタンダードプラン（月額2,980円）、プレミアムプラン（月額9,800円）の3つのプランをご用意しています。詳細はプラン選択ページをご覧ください。",
      },
      {
        question: "支払い方法は何がありますか？",
        answer:
          "クレジットカード（VISA、Mastercard、JCB、AMEX）、請求書払い（法人のみ）に対応しています。",
      },
      {
        question: "プランはいつでも変更できますか？",
        answer:
          "はい、いつでもプランの変更が可能です。アップグレードは即時反映、ダウングレードは次の請求サイクルから適用されます。",
      },
    ],
  },
  {
    id: "content",
    title: "記事・コンテンツについて",
    icon: FileText,
    faqs: [
      {
        question: "記事は誰が書いていますか？",
        answer:
          "記事は、教育現場の実践者やEdTech専門家、編集部が執筆しています。実践的な内容を心がけ、信頼性の高い情報を提供しています。",
      },
      {
        question: "記事の内容を引用・転載できますか？",
        answer:
          "記事の内容は著作権で保護されています。引用・転載をご希望の場合は、事前にお問い合わせフォームからご連絡ください。",
      },
      {
        question: "記事の投稿はできますか？",
        answer:
          "クリエイタープランに登録いただくと、記事の投稿が可能です。投稿された記事は審査後に公開されます。",
      },
    ],
  },
  {
    id: "listing",
    title: "サービス掲載について",
    icon: Settings,
    faqs: [
      {
        question: "自社のサービスを掲載したいのですが",
        answer:
          "EdTechサービスを提供している企業様は、「サービス掲載について」ページからお申し込みいただけます。審査後、掲載させていただきます。",
      },
      {
        question: "掲載費用はかかりますか？",
        answer:
          "基本的な掲載は無料です。より充実した情報の掲載や、おすすめ枠への表示など、有料オプションもご用意しています。",
      },
      {
        question: "掲載情報の更新はできますか？",
        answer:
          "はい、掲載情報の更新は可能です。ダッシュボードから直接編集いただけます。",
      },
    ],
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) =>
      selectedCategory ? category.id === selectedCategory : category.faqs.length > 0
    );

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">よくある質問</h1>
        <p className="text-muted-foreground">
          お問い合わせの前に、こちらをご確認ください
        </p>
      </div>

      {/* 検索 */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="質問を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          すべて
        </Button>
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="gap-1"
            >
              <Icon className="h-4 w-4" />
              {category.title}
            </Button>
          );
        })}
      </div>

      {/* FAQ一覧 */}
      <div className="max-w-3xl mx-auto space-y-6">
        {filteredCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCategories.length === 0 ||
        (filteredCategories.every((c) => c.faqs.length === 0) && (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              該当する質問が見つかりませんでした
            </p>
          </div>
        ))}

      {/* お問い合わせ案内 */}
      <Card className="max-w-3xl mx-auto mt-12 bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <MessageCircle className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">解決しない場合は</h2>
          <p className="text-muted-foreground mb-4">
            よくある質問で解決しない場合は、お気軽にお問い合わせください。
          </p>
          <Button asChild>
            <Link href="/contact">お問い合わせする</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
