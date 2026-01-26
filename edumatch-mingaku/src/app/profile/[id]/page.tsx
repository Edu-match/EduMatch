import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Star,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  MessageSquare,
  FileText,
  Award,
} from "lucide-react";

// ダミーデータ（実際にはAPIから取得）
const profiles: Record<
  string,
  {
    id: number;
    name: string;
    title: string;
    image: string;
    location: string;
    rating: number;
    reviews: number;
    experience: string;
    hourlyRate: string;
    available: boolean;
    skills: string[];
    bio: string;
    education: { school: string; degree: string; year: string }[];
    certifications: string[];
    portfolio: { title: string; description: string }[];
  }
> = {
  "1": {
    id: 1,
    name: "山田太郎",
    title: "EdTechコンサルタント",
    image: "https://placehold.co/200x200/e2e8f0/334155?text=YT",
    location: "東京都",
    rating: 4.9,
    reviews: 45,
    experience: "10年以上",
    hourlyRate: "¥15,000",
    available: true,
    skills: ["AI活用", "学校DX", "導入支援", "プロジェクト管理", "研修講師"],
    bio: `教育ICTの導入支援を10年以上行ってきました。GIGAスクール構想の立ち上げから運用まで、多くの学校を支援しています。

特に以下の分野を得意としています：
- 学校全体のICT環境設計
- 教員向けICT研修の企画・実施
- 保護者・地域との連携支援
- データを活用した教育改善

これまでに50校以上の導入支援実績があり、教育現場の実情を踏まえた提案が可能です。`,
    education: [
      { school: "東京大学大学院", degree: "教育学研究科修了", year: "2010年" },
      { school: "早稲田大学", degree: "教育学部卒業", year: "2008年" },
    ],
    certifications: [
      "Google認定教育者 レベル2",
      "Microsoft Innovative Educator",
      "情報処理技術者（応用情報）",
    ],
    portfolio: [
      {
        title: "○○市教育委員会 GIGAスクール導入支援",
        description: "市内全30校へのタブレット導入とICT活用研修を実施",
      },
      {
        title: "△△高校 学校DX推進プロジェクト",
        description: "校務のデジタル化と学習分析システムの構築を支援",
      },
    ],
  },
};

export default function ProfileDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = profiles[params.id];

  if (!profile) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">プロファイルが見つかりません</h1>
          <Button asChild>
            <Link href="/talent">人材検索に戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/talent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          人材検索に戻る
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* プロファイルヘッダー */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Image
                    src={profile.image}
                    alt={profile.name}
                    width={150}
                    height={150}
                    className="rounded-full"
                    unoptimized
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    {profile.available ? (
                      <Badge className="bg-green-500">対応可能</Badge>
                    ) : (
                      <Badge variant="secondary">現在対応不可</Badge>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground mb-4">
                    {profile.title}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {profile.rating} ({profile.reviews}件のレビュー)
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {profile.experience}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 自己紹介 */}
          <Card>
            <CardHeader>
              <CardTitle>自己紹介</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{profile.bio}</p>
            </CardContent>
          </Card>

          {/* スキル */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                スキル・専門分野
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 実績・ポートフォリオ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                実績・ポートフォリオ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.portfolio.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-muted/50 border-l-4 border-primary"
                  >
                    <h4 className="font-medium mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 学歴・資格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  学歴
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.education.map((edu, index) => (
                    <div key={index}>
                      <p className="font-medium">{edu.school}</p>
                      <p className="text-sm text-muted-foreground">
                        {edu.degree}（{edu.year}）
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  資格・認定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {profile.certifications.map((cert, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="text-sm">{cert}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 料金・相談 */}
          <Card>
            <CardHeader>
              <CardTitle>料金</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">時給目安</p>
                <p className="text-3xl font-bold text-primary">
                  {profile.hourlyRate}
                </p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" disabled={!profile.available}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  相談する
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/consultation">
                    <Calendar className="h-4 w-4 mr-2" />
                    無料相談を予約
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* レビュー */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>レビュー</span>
                <span className="flex items-center gap-1 text-sm font-normal">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {profile.rating}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="h-3 w-3 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-sm">
                    導入支援のプロフェッショナル。わかりやすい説明で安心できました。
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ○○中学校 ICT担当
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= 4
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-muted text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm">
                    研修が非常に実践的で、先生方からも好評でした。
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    △△小学校 校長
                  </p>
                </div>
              </div>
              <Button variant="link" className="w-full mt-2">
                すべてのレビューを見る ({profile.reviews}件)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
