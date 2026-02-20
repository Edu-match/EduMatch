import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Clock,
  Percent,
  Star,
  ArrowRight,
  CalendarDays,
  Users,
} from "lucide-react";

const campaigns = [
  {
    id: 1,
    title: "新規導入キャンペーン",
    description:
      "ClassTech Proを新規導入いただいた学校様に、初期設定サポートが無料になるキャンペーン実施中！",
    image: "https://placehold.co/600x300/fef3c7/ca8a04?text=Campaign",
    discount: "初期費用 50%OFF",
    service: "ClassTech Pro",
    endDate: "2024-03-31",
    conditions: ["新規導入の学校限定", "100名以上でのご契約"],
    type: "discount",
    featured: true,
  },
  {
    id: 2,
    title: "無料トライアル延長キャンペーン",
    description:
      "SmartAssessの無料トライアル期間を通常2週間から1ヶ月に延長！じっくりお試しいただけます。",
    image: "https://placehold.co/600x300/fecaca/dc2626?text=Trial",
    discount: "トライアル期間2倍",
    service: "SmartAssess",
    endDate: "2024-02-29",
    conditions: ["初めてお申し込みの方限定"],
    type: "trial",
    featured: true,
  },
  {
    id: 3,
    title: "春の乗り換えキャンペーン",
    description:
      "他社サービスからの乗り換えで、最初の3ヶ月が30%OFFになるキャンペーン。",
    image: "https://placehold.co/600x300/fed7aa/ea580c?text=Switch",
    discount: "3ヶ月間 30%OFF",
    service: "EduCollabo",
    endDate: "2024-04-30",
    conditions: ["他社サービスからの乗り換え", "年間契約が条件"],
    type: "discount",
    featured: false,
  },
  {
    id: 4,
    title: "複数校導入割引",
    description:
      "同一法人で複数校に導入いただく場合、ボリュームディスカウントが適用されます。",
    image: "https://placehold.co/600x300/d9f99d/65a30d?text=Volume",
    discount: "最大 40%OFF",
    service: "LearnSpace",
    endDate: "2024-12-31",
    conditions: ["3校以上での導入", "同一法人・教育委員会"],
    type: "volume",
    featured: false,
  },
];

const limitedOffers = [
  {
    id: 1,
    title: "先着100校限定",
    description: "導入コンサルティング無料",
    remaining: 23,
    total: 100,
  },
  {
    id: 2,
    title: "今週末まで",
    description: "オンライン相談で特典プレゼント",
    remaining: 3,
    total: null,
  },
];

export default function CampaignsPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">キャンペーン情報</h1>
        </div>
        <p className="text-muted-foreground">
          限定キャンペーンやお得な情報をお見逃しなく
        </p>
      </div>

      {/* 注目のキャンペーン */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          注目のキャンペーン
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns
            .filter((c) => c.featured)
            .map((campaign) => (
              <Card
                key={campaign.id}
                className="overflow-hidden border-2 border-primary/20"
              >
                <div className="relative w-full aspect-video overflow-hidden">
                  <Image
                    src={campaign.image}
                    alt={campaign.title}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                  <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600">
                    {campaign.discount}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{campaign.service}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(campaign.endDate).toLocaleDateString("ja-JP")}まで
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{campaign.title}</h3>
                  <p className="text-muted-foreground mb-4">
                    {campaign.description}
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">適用条件:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {campaign.conditions.map((condition, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="text-primary">•</span>
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full">
                    キャンペーンに申し込む
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      {/* 期間限定オファー */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          期間限定オファー
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {limitedOffers.map((offer) => (
            <Card key={offer.id} className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-orange-500 hover:bg-orange-600 mb-2">
                      {offer.title}
                    </Badge>
                    <p className="font-bold text-lg">{offer.description}</p>
                    {offer.remaining && (
                      <p className="text-sm text-muted-foreground mt-1">
                        残り {offer.remaining} / {offer.total} 枠
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    詳細
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* すべてのキャンペーン */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Percent className="h-5 w-5 text-green-500" />
          すべてのキャンペーン
        </h2>
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative w-full md:w-48 flex-shrink-0 aspect-video overflow-hidden">
                    <Image
                      src={campaign.image}
                      alt={campaign.title}
                      fill
                      className="object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-red-500 hover:bg-red-600">
                        {campaign.discount}
                      </Badge>
                      <Badge variant="secondary">{campaign.service}</Badge>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{campaign.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {campaign.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(campaign.endDate).toLocaleDateString("ja-JP")}まで
                      </span>
                      <Button variant="outline" size="sm">
                        詳細を見る
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* キャンペーン情報の受け取り */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            キャンペーン情報をいち早くゲット
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            会員登録すると、新しいキャンペーン情報をメールでお届けします。限定オファーもあります！
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/auth/login">無料会員登録</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/login">ログイン</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
