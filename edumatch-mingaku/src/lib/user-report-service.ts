import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  USER_REPORT_NOTIFICATION_KIND,
} from "@/lib/in-app-notification-constants";
import {
  USER_REPORT_REASON_LABELS,
  type UserReportContextKind,
  type UserReportReasonCode,
} from "@/lib/user-report-reasons";
import { sendSlackUserReport } from "@/lib/slack-user-report";

export type SubmitUserReportInput = {
  reporterId: string;
  reportedUserId: string;
  reasonCode: UserReportReasonCode;
  detail: string | null;
  contextKind: UserReportContextKind;
  contextExcerpt: string | null;
};

function resolveSlackWebhook(): string | undefined {
  const direct = process.env.SLACK_USER_REPORT_WEBHOOK_URL?.trim();
  if (direct) return direct;
  return process.env.SLACK_COMMUNITY_ALERT_WEBHOOK_URL?.trim();
}

/**
 * 報告を保存し、全管理者にサイト内通知＋（設定時）Slack へ送信する。
 */
export async function submitUserReport(input: SubmitUserReportInput): Promise<{
  ok: true;
  reportId: string;
} | { ok: false; error: string }> {
  if (input.reporterId === input.reportedUserId) {
    return { ok: false, error: "自分自身を報告することはできません。" };
  }

  const [reporter, subject] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: input.reporterId },
      select: { id: true, name: true },
    }),
    prisma.profile.findUnique({
      where: { id: input.reportedUserId },
      select: { id: true, name: true },
    }),
  ]);

  if (!reporter || !subject) {
    return { ok: false, error: "ユーザー情報を確認できませんでした。" };
  }

  const report = await prisma.userReport.create({
    data: {
      reporter_id: input.reporterId,
      reported_user_id: input.reportedUserId,
      reason_code: input.reasonCode,
      detail: input.detail?.trim() ? input.detail.trim().slice(0, 4000) : null,
      context_kind: input.contextKind,
      context_excerpt: input.contextExcerpt?.trim()
        ? input.contextExcerpt.trim().slice(0, 8000)
        : null,
    },
  });

  const admins = await prisma.profile.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  const title = `【ユーザー報告】${reporter.name}さんが「${subject.name}」さんを報告しました`;
  const link = `/admin/user-reports?highlight=${encodeURIComponent(report.id)}`;

  if (admins.length > 0) {
    await prisma.inAppNotification.createMany({
      data: admins.map((a) => ({
        user_id: a.id,
        kind: USER_REPORT_NOTIFICATION_KIND,
        title,
        link,
        source_id: report.id,
      })),
      skipDuplicates: true,
    });
  }

  const webhook = resolveSlackWebhook();
  if (webhook) {
    void sendSlackUserReport(webhook, {
      reportId: report.id,
      reporterName: reporter.name,
      reporterId: reporter.id,
      reportedName: subject.name,
      reportedUserId: subject.id,
      reasonLabel: USER_REPORT_REASON_LABELS[input.reasonCode],
      detail: input.detail?.trim() ?? null,
      contextKind: input.contextKind,
      contextExcerpt: input.contextExcerpt?.trim() ?? null,
    });
  }

  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/mypage");
  revalidatePath("/dashboard");
  revalidatePath("/admin/user-reports");

  return { ok: true, reportId: report.id };
}
