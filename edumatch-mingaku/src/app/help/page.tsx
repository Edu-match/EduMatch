import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, Mail, BookOpen, HelpCircle } from "lucide-react";
import { OpenAiChatButton } from "@/components/ui/open-ai-chat-button";

const faqCategories = [
  {
    title: "サービスについて",
    items: [
      {
        question: "エデュマッチとは何ですか？",
        answer:
          "エデュマッチは、教育現場とEdTechをつなぐマッチングプラットフォームです。最新の教育事例やEdTechツールを検索・比較し、最適なサービスを見つけることができます。",
      },
      {
        question: "会員登録は必要ですか？",
        answer:
          "記事の閲覧は会員登録なしで可能です。お気に入り登録・ブックマーク機能・資料請求・詳細情報の閲覧には会員登録（無料）が必要です。",
      },
      {
        question: "サービスを利用するにはどうすればいいですか？",
        answer:
          "エデュマッチのサービス詳細ページから、各サービスへの資料請求が可能です（会員登録が必要です）。また、提供元企業の公式サイトへアクセスして、お問い合わせや申し込みを直接行うこともできます。",
      },
    ],
  },
  {
    title: "記事について",
    items: [
      {
        question: "記事は誰が書いていますか？",
        answer:
          "記事は、教育現場の実践者やEdTech専門家、編集部が執筆しています。実践的な内容を心がけ、信頼性の高い情報を提供しています。",
      },
      {
        question: "記事の内容を引用・転載できますか？",
        answer:
          "記事の内容は著作権で保護されています。引用・転載をご希望の場合は、事前にご連絡ください。",
      },
      {
        question: "記事の投稿はできますか？",
        answer:
          "現在、記事の投稿は編集部が管理しています。投稿をご希望の場合は、お問い合わせフォームからご連絡ください。",
      },
    ],
  },
  {
    title: "サービス掲載について",
    items: [
      {
        question: "自社のサービスを掲載したいのですが",
        answer:
          "EdTechサービスを提供している企業様は、お問い合わせフォームからご連絡ください。審査後、掲載させていただきます。",
      },
      {
        question: "掲載費用はかかりますか？",
        answer:
          "基本的な掲載は無料です。詳細な料金プランについては、お問い合わせ時にご案内いたします。",
      },
      {
        question: "掲載情報の更新はできますか？",
        answer:
          "はい、掲載情報の更新は可能です。お問い合わせフォームからご連絡ください。",
      },
    ],
  },
  {
    title: "その他",
    items: [
      {
        question: "利用規約はどこで確認できますか？",
        answer:
          "サイト下部のフッターから「利用規約」ページにアクセスできます。",
      },
      {
        question: "プライバシーポリシーはどこで確認できますか？",
        answer:
          "サイト下部のフッターから「プライバシーポリシー」ページにアクセスできます。",
      },
      {
        question: "お問い合わせ方法を教えてください",
        answer:
          "お問い合わせは、お問い合わせフォームまたはメール（info@edu-match.com）からお願いいたします。",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ヘルプ・サポート</h1>
        <p className="text-muted-foreground">
          よくある質問やサポート情報をご確認ください
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {faqCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.items.map((item, itemIndex) => (
                    <AccordionItem
                      key={itemIndex}
                      value={`item-${categoryIndex}-${itemIndex}`}
                    >
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">お問い合わせ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                よくある質問で解決しない場合は、お気軽にお問い合わせください。
              </p>
              <Button asChild className="w-full">
                <Link href="/contact">
                  <Mail className="h-4 w-4 mr-2" />
                  お問い合わせフォーム
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">関連リンク</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/about"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                エデュマッチについて
              </Link>
              <Link
                href="/terms"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                プライバシーポリシー
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AIナビゲーター（チャットサポート）</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                AIナビゲーターで質問・サポートを受けることができます（AIによる自動応答です）。
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                ご利用の際は
                <Link href="/help/ai-navigator-disclaimer" className="text-primary underline hover:no-underline">
                  利用上の注意
                </Link>
                をご確認ください。
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                <Link href="/help/chat-usage-limit" className="text-primary underline hover:no-underline">
                  利用回数・回復日時の詳細
                </Link>
              </p>
              <OpenAiChatButton variant="outline" className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                AIチャットを開く
              </OpenAiChatButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
