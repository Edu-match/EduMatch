import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserRole } from "@/app/_actions/user";
import { FileText, Shield, Newspaper, SlidersHorizontal } from "lucide-react";

const PAGES = [
  { key: "terms", label: "利用規約", href: "/admin/pages/terms/edit", icon: FileText },
  { key: "privacy", label: "プライバシーポリシー", href: "/admin/pages/privacy/edit", icon: Shield },
  { key: "service_content", label: "サービス内容一覧", href: "/admin/pages/service_content/edit", icon: FileText },
  { key: "home-topics", label: "トップニュースを編集", href: "/admin/home-topics", icon: Newspaper },
  { key: "home-slider", label: "スライダー記事を選択", href: "/admin/home-slider", icon: SlidersHorizontal },
] as const;

export default async function AdminPagesPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">固定ページ・表示設定</h1>
        <p className="text-sm text-muted-foreground mt-1">
          利用規約・プライバシーポリシー・トップページの表示設定を編集できます
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PAGES.map(({ key, label, href, icon: Icon }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={href}>
                  編集する
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
