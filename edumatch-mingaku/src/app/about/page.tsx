import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Target,
  Heart,
  MapPin,
  Mail,
  Phone,
  Globe,
  ArrowRight,
} from "lucide-react";

const values = [
  {
    icon: Target,
    title: "教育の可能性を広げる",
    description:
      "テクノロジーの力で、すべての教育者と学習者に新しい可能性を提供します。",
  },
  {
    icon: Users,
    title: "つながりを創る",
    description:
      "教育現場とEdTechサービスをつなぎ、最適なマッチングを実現します。",
  },
  {
    icon: Heart,
    title: "現場に寄り添う",
    description:
      "教育現場の実情を理解し、本当に役立つ情報とサービスを提供します。",
  },
];

const teamMembers = [
  {
    name: "田中一郎",
    role: "代表取締役CEO",
    image: "https://placehold.co/150x150/e2e8f0/334155?text=TI",
    bio: "元教員。教育ICTの普及に20年以上携わる。",
  },
  {
    name: "佐藤花子",
    role: "取締役COO",
    image: "https://placehold.co/150x150/fef3c7/ca8a04?text=SH",
    bio: "EdTechスタートアップで事業開発を経験。",
  },
  {
    name: "鈴木健太",
    role: "CTO",
    image: "https://placehold.co/150x150/fed7aa/ea580c?text=SK",
    bio: "教育系Webサービスの開発に10年以上従事。",
  },
];

export default function AboutPage() {
  return (
    <div className="container py-8">
      {/* ヒーローセクション */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">会社概要</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          教育の未来を見つける、つながる
          <br />
          エデュマッチは教育現場とEdTechをつなぐプラットフォームです
        </p>
      </div>

      {/* ミッション */}
      <section className="mb-16">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">ミッション</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              「すべての教育者が、最適なEdTechツールに出会える世界を創る」
              <br />
              <br />
              私たちは、教育現場が抱える課題を解決し、より良い教育環境の実現を
              サポートするために、信頼できる情報と最適なサービスのマッチングを提供します。
            </p>
          </CardContent>
        </Card>
      </section>

      {/* バリュー */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">私たちの価値観</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <Card key={value.title}>
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 会社情報 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">会社情報</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">会社名</p>
                    <p className="text-muted-foreground">
                      株式会社スタディパーク
                    </p>
                    <p className="text-sm text-muted-foreground">
                      （運営サービス：エデュマッチ）
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">所在地</p>
                    <p className="text-muted-foreground">
                      〒105-0004
                      <br />
                      東京都港区新橋2-20-15
                      <br />
                      新橋駅前ビル1号館6階
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">代表者</p>
                    <p className="text-muted-foreground">代表取締役 田中一郎</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">メールアドレス</p>
                    <p className="text-muted-foreground">info@edu-match.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">電話番号</p>
                    <p className="text-muted-foreground">03-1234-5678</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">設立</p>
                    <p className="text-muted-foreground">2020年4月1日</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* チーム */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">経営チーム</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <Card key={member.name}>
              <CardContent className="p-6 text-center">
                <Image
                  src={member.image}
                  alt={member.name}
                  width={100}
                  height={100}
                  className="rounded-full mx-auto mb-4"
                  unoptimized
                />
                <h3 className="font-bold">{member.name}</h3>
                <p className="text-sm text-primary mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* アクセス */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">アクセス</h2>
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">
                [Google Maps 埋め込み表示エリア]
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 text-center text-muted-foreground">
          <p>JR各線・東京メトロ銀座線・都営浅草線「新橋駅」より徒歩1分</p>
        </div>
      </section>

      {/* CTA */}
      <section>
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">お問い合わせ</h2>
            <p className="text-muted-foreground mb-6">
              サービスに関するお問い合わせ、取材依頼、パートナーシップのご相談など、
              お気軽にご連絡ください。
            </p>
            <Button asChild size="lg">
              <Link href="/contact">
                お問い合わせする
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
