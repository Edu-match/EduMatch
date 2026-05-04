import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { ActivityFeed } from "./activity-feed";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";

export const metadata = { title: "操作ログ | 管理者" };

export default async function ActivityLogPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="container py-6 max-w-4xl">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="ghost" size="sm" className="-ml-2 -mt-1">
              <Link href="/provider-dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                ダッシュボード
              </Link>
            </Button>
          </div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            操作ログ
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            サイト内のほぼすべての変更を時系列で確認できます。メモ欄でやり取りも可能です。
          </p>
        </div>
      </div>

      <ActivityFeed currentUserId={profile.id} />
    </div>
  );
}
