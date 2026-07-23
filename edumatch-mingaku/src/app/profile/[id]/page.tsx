import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Globe,
  FileText,
} from "lucide-react";
import { getProfileWithContents } from "@/app/_actions";
import { notFound } from "next/navigation";
import { ProfileContentsTabs } from "./profile-contents-tabs";

export const dynamic = "force-dynamic";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfileWithContents(id);

  if (!profile) {
    notFound();
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          トップに戻る
        </Link>
      </Button>

      {/* ========== プロフィールセクション ========== */}
      <section className="mb-10">
        <h2 className="sr-only">プロフィール</h2>
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg">プロフィール</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name}
                    width={120}
                    height={120}
                    className="rounded-full border-2 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-primary/10 flex items-center justify-center border-2">
                    <Building2 className="h-12 w-12 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2">{profile.name}</h1>
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    公式サイト・SNS
                  </a>
                )}
              </div>
            </div>
            {profile.bio && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="flex items-center gap-2 font-semibold mb-2">
                  <FileText className="h-4 w-4" />
                  自己紹介
                </h3>
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {profile.bio}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ========== 記事・サービスセクション（タブで切り替え） ========== */}
      <section>
        <h2 className="sr-only">{profile.name}の記事・サービス</h2>
        <ProfileContentsTabs
          services={profile.services}
          posts={profile.posts}
          profileName={profile.name}
        />
      </section>

      {/* サイドバー相当：お問い合わせ（必要ならここに追加） */}
      <div className="mt-8">
        <Card>
          <CardContent className="p-6">
            <Button asChild className="w-full">
              <Link href="/contact">お問い合わせ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
