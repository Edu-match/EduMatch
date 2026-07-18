import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_REPORT_REASON_LABELS, type UserReportReasonCode } from "@/lib/user-report-reasons";
import { ArrowLeft, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "ユーザー報告 | 管理者" };

type Props = { searchParams: Promise<{ highlight?: string }> };

function reasonLabel(code: string): string {
  if (code in USER_REPORT_REASON_LABELS) {
    return USER_REPORT_REASON_LABELS[code as UserReportReasonCode];
  }
  return code;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

export default async function AdminUserReportsPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") redirect("/dashboard");
  const { highlight } = await searchParams;

  const rows = await prisma.userReport.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      subject: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div className="container py-6 max-w-5xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 -mt-1 mb-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            ダッシュボード
          </Link>
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Flag className="h-5 w-5 text-rose-600" />
          ユーザー報告
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          会員から届いた通報の一覧です。対応後も記録として残ります。
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            報告はまだありません。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const isHi = highlight === r.id;
            return (
              <Card
                key={r.id}
                id={`report-${r.id}`}
                className={cn(
                  "scroll-mt-24",
                  isHi && "ring-2 ring-primary/50 ring-offset-2"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-sm font-mono text-muted-foreground">
                      {r.id}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">報告者</p>
                      <p className="font-medium">{r.reporter.name}</p>
                      <p className="text-xs text-muted-foreground break-all">{r.reporter.email}</p>
                      <p className="text-xs font-mono mt-0.5">{r.reporter.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">対象ユーザー</p>
                      <p className="font-medium">{r.subject.name}</p>
                      <p className="text-xs text-muted-foreground break-all">{r.subject.email}</p>
                      <p className="text-xs font-mono mt-0.5">{r.subject.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{reasonLabel(r.reason_code)}</Badge>
                    <Badge variant="outline">文脈: {r.context_kind}</Badge>
                  </div>
                  {r.detail && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">補足</p>
                      <p className="whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-sm">
                        {r.detail}
                      </p>
                    </div>
                  )}
                  {r.context_excerpt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">抜粋</p>
                      <p className="whitespace-pre-wrap rounded-md border px-3 py-2 text-sm">
                        {r.context_excerpt}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
