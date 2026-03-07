import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserRole } from "@/app/_actions/user";
import { getHomeTopicsPostsForAdmin } from "@/app/_actions/home-topics";
import { Button } from "@/components/ui/button";
import { HomeTopicsAdminClient } from "./home-topics-admin-client";

export default async function AdminHomeTopicsPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const posts = await getHomeTopicsPostsForAdmin(100);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">トップページニュースタブ管理</h1>
          <p className="text-sm text-muted-foreground">
            「すべて」「国内ニュース」「海外ニュース」「週間ニュース」の各タブに表示する記事を設定できます。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">トップページを表示</Link>
        </Button>
      </div>

      <HomeTopicsAdminClient posts={posts} />
    </div>
  );
}

