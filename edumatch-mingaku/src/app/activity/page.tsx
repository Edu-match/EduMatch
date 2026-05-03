import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getActivityLogs, getActivityComments } from "@/app/_actions/activity-log";
import type { ActivityAction, ActivityTargetType } from "@/app/_actions/activity-log";
import { ActivityComments } from "@/components/activity/activity-comments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle, XCircle, FilePlus, FileEdit, Trash2,
  SendHorizonal, EyeOff, Eye, Activity, User,
} from "lucide-react";

export const metadata = { title: "アクティビティ | エデュマッチ" };

const ACTION_LABELS: Record<ActivityAction, { label: string; icon: React.ElementType; color: string }> = {
  CREATE:  { label: "作成",   icon: FilePlus,      color: "bg-blue-100 text-blue-800" },
  UPDATE:  { label: "更新",   icon: FileEdit,      color: "bg-amber-100 text-amber-800" },
  DELETE:  { label: "削除",   icon: Trash2,        color: "bg-red-100 text-red-800" },
  APPROVE: { label: "承認",   icon: CheckCircle,   color: "bg-green-100 text-green-800" },
  REJECT:  { label: "却下",   icon: XCircle,       color: "bg-rose-100 text-rose-800" },
  SUBMIT:  { label: "申請",   icon: SendHorizonal, color: "bg-violet-100 text-violet-800" },
  HIDE:    { label: "非表示", icon: EyeOff,        color: "bg-slate-100 text-slate-700" },
  SHOW:    { label: "再表示", icon: Eye,           color: "bg-teal-100 text-teal-800" },
};

const TARGET_LABELS: Record<ActivityTargetType, string> = {
  POST:        "記事",
  SERVICE:     "サービス",
  SITE_PAGE:   "固定ページ",
  EVENT:       "イベント",
  SITE_UPDATE: "運営記事",
  FORUM_POST:  "井戸端会議",
};

function getTargetHref(type: ActivityTargetType, id: string): string | null {
  switch (type) {
    case "POST":        return `/articles/${id}`;
    case "SERVICE":     return `/services/${id}`;
    case "EVENT":       return `/events/${id}`;
    case "SITE_UPDATE": return `/site-updates/${id}`;
    default:            return null;
  }
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return new Date(date).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ActivityFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; action?: string }>;
}) {
  const [profile, params] = await Promise.all([getCurrentProfile(), searchParams]);

  if (!profile || profile.role !== "ADMIN") {
    redirect("/");
  }

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const filterType = (params.type ?? "") as ActivityTargetType | "";
  const filterAction = (params.action ?? "") as ActivityAction | "";
  const limit = 20;
  const offset = (page - 1) * limit;

  const { logs, total } = await getActivityLogs({
    limit,
    offset,
    targetType: filterType || undefined,
    action: filterAction || undefined,
    includeCommentCount: true,
  });

  // Fetch comments for each log entry
  const commentsMap = Object.fromEntries(
    await Promise.all(
      logs.map(async (log) => [log.id, await getActivityComments(log.id)])
    )
  );

  const totalPages = Math.ceil(total / limit);

  function buildUrl(overrides: Record<string, string | number>) {
    const p = new URLSearchParams();
    if (filterType) p.set("type", filterType);
    if (filterAction) p.set("action", filterAction);
    p.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => p.set(k, String(v)));
    return `/activity?${p.toString()}`;
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          アクティビティ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          サイト内での最新の活動をお知らせします
        </p>
      </div>

      {/* フィルター */}
      <Card className="mb-5">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium shrink-0">種別:</span>
            <Link href={buildUrl({ type: "", page: 1 })}>
              <Badge variant={!filterType ? "default" : "outline"} className="cursor-pointer">すべて</Badge>
            </Link>
            {(Object.entries(TARGET_LABELS) as [ActivityTargetType, string][]).map(([type, label]) => (
              <Link key={type} href={buildUrl({ type, page: 1 })}>
                <Badge variant={filterType === type ? "default" : "outline"} className="cursor-pointer">{label}</Badge>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">操作:</span>
            <Link href={buildUrl({ action: "", page: 1 })}>
              <Badge variant={!filterAction ? "default" : "outline"} className="cursor-pointer">すべて</Badge>
            </Link>
            {(Object.entries(ACTION_LABELS) as [ActivityAction, (typeof ACTION_LABELS)[ActivityAction]][]).map(([action, { label }]) => (
              <Link key={action} href={buildUrl({ action, page: 1 })}>
                <Badge variant={filterAction === action ? "default" : "outline"} className="cursor-pointer">{label}</Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* フィード */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            全 {total.toLocaleString()} 件 ({offset + 1}–{Math.min(offset + limit, total)} 件目)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              アクティビティはまだありません
            </p>
          ) : (
            <ol className="divide-y divide-border">
              {logs.map((log) => {
                const meta = ACTION_LABELS[log.action as ActivityAction];
                const Icon = meta?.icon ?? Activity;
                const targetHref = getTargetHref(log.target_type as ActivityTargetType, log.target_id);
                const targetLabel = TARGET_LABELS[log.target_type as ActivityTargetType] ?? log.target_type;
                const logComments = commentsMap[log.id] ?? [];

                return (
                  <li key={log.id} className="px-4 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-3">
                      {/* アイコン */}
                      <div className="shrink-0 mt-0.5">
                        <span className={`inline-flex items-center justify-center rounded-full p-1.5 ${meta?.color ?? "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      </div>

                      {/* 本文 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          {/* アクター名 */}
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {log.actor_name}
                          </span>
                          <span className="text-muted-foreground">が</span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">{targetLabel}</Badge>
                          {targetHref ? (
                            <Link href={targetHref} className="font-medium hover:underline truncate max-w-[200px] sm:max-w-xs text-primary">
                              {log.target_title}
                            </Link>
                          ) : (
                            <span className="font-medium truncate max-w-[200px] sm:max-w-xs">{log.target_title}</span>
                          )}
                          <span className="text-muted-foreground">を</span>
                          <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${meta?.color ?? ""}`}>
                            {meta?.label ?? log.action}
                          </span>
                        </div>

                        {log.detail && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.detail}</p>
                        )}

                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeTime(log.created_at)}
                        </div>

                        {/* コメントセクション */}
                        <ActivityComments
                          logId={log.id}
                          initialComments={logComments}
                          initialCount={log.commentCount ?? logComments.length}
                          isLoggedIn={!!profile}
                          currentUserId={profile?.id ?? null}
                          isAdmin={profile?.role === "ADMIN"}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildUrl({ page: page - 1 })}>← 前へ</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages} ページ
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={buildUrl({ page: page + 1 })}>次へ →</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
