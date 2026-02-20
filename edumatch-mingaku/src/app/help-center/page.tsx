import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  BookOpen,
  FileText,
  Video,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  Star,
  Users,
  Settings,
  CreditCard,
  Newspaper,
} from "lucide-react";

const quickLinks = [
  { title: "はじめての方へ", href: "/help-center/getting-started", icon: Star },
  { title: "アカウント設定", href: "/profile/register", icon: Settings },
  { title: "料金・プラン", href: "/plans", icon: CreditCard },
  { title: "よくある質問", href: "/faq", icon: HelpCircle },
];

const categories = [
  {
    title: "サービスの使い方",
    icon: BookOpen,
    articles: [
      { title: "サービスを検索する方法", href: "#" },
      { title: "記事を閲覧・保存する方法", href: "#" },
      { title: "レビューを投稿する方法", href: "#" },
      { title: "資料請求の手順", href: "#" },
    ],
  },
  {
    title: "アカウント管理",
    icon: Users,
    articles: [
      { title: "会員登録の手順", href: "#" },
      { title: "プロフィールの設定方法", href: "#" },
      { title: "パスワードの変更方法", href: "#" },
      { title: "退会の手続き", href: "#" },
    ],
  },
  {
    title: "料金・決済",
    icon: CreditCard,
    articles: [
      { title: "各プランの違いについて", href: "#" },
      { title: "支払い方法の変更", href: "#" },
      { title: "領収書の発行方法", href: "#" },
      { title: "解約・返金について", href: "#" },
    ],
  },
  {
    title: "記事投稿（クリエイター向け）",
    icon: Newspaper,
    articles: [
      { title: "記事の投稿方法", href: "#" },
      { title: "記事のフォーマットガイド", href: "#" },
      { title: "収益化について", href: "#" },
      { title: "著作権について", href: "#" },
    ],
  },
];

const popularArticles = [
  { title: "会員登録の手順", views: 1234 },
  { title: "プランの比較と選び方", views: 987 },
  { title: "パスワードをお忘れの場合", views: 876 },
  { title: "資料請求から導入までの流れ", views: 765 },
  { title: "レビューの投稿ガイドライン", views: 654 },
];

export default function HelpCenterPage() {
  return (
    <div className="container py-8">
      {/* ヒーロー */}
      <div className="text-center mb-12 py-12 bg-gradient-to-b from-primary/5 to-background rounded-lg">
        <h1 className="text-4xl font-bold mb-4">ヘルプセンター</h1>
        <p className="text-lg text-muted-foreground mb-8">
          お困りのことはありませんか？必要な情報をお探しください。
        </p>
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="キーワードで検索..."
              className="pl-12 h-14 text-lg"
            />
          </div>
        </div>
      </div>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.title} href={link.href}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium">{link.title}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* カテゴリ別ヘルプ */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold">カテゴリ別ヘルプ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.title}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.articles.map((article) => (
                        <li key={article.title}>
                          <Link
                            href={article.href}
                            className="flex items-center justify-between text-sm hover:text-primary transition-colors"
                          >
                            {article.title}
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 人気の記事 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                人気の記事
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {popularArticles.map((article, index) => (
                  <li key={article.title}>
                    <Link
                      href="#"
                      className="flex items-start gap-3 hover:text-primary transition-colors"
                    >
                      <span className="text-muted-foreground font-mono text-sm">
                        {index + 1}
                      </span>
                      <span className="text-sm">{article.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 動画ガイド */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                動画ガイド
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                <Video className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                エデュマッチの使い方を動画でわかりやすく解説しています。
              </p>
              <Button variant="outline" className="w-full">
                動画一覧を見る
              </Button>
            </CardContent>
          </Card>

          {/* お問い合わせ */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                お問い合わせ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                解決しない場合は、お気軽にお問い合わせください。
              </p>
              <div className="space-y-2">
                <Button className="w-full" asChild>
                  <Link href="/contact">お問い合わせフォーム</Link>
                </Button>
                <Button variant="outline" className="w-full">
                  AIチャットで相談
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
