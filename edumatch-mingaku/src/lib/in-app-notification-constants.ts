export const SITE_UPDATE_NOTIFICATION_KIND = "SITE_UPDATE";

/** 管理者向け：ユーザー報告があったときのサイト内通知 */
export const USER_REPORT_NOTIFICATION_KIND = "USER_REPORT";

/** 井戸端の人間発言がしきい値に達したとき（管理者のみ配信） */
export const FORUM_ARTICLE_SUGGESTION_KIND = "FORUM_ARTICLE_SUGGESTION";

/** DB に旧プレフィックスが残っている場合の表示用 */
export function formatInAppNotificationTitle(title: string): string {
  return title.replace(/^【運営お知らせ】/, "【運営からのお知らせ】");
}

export type InAppNotificationRow = {
  id: string;
  kind: string;
  title: string;
  link: string | null;
  read: boolean;
  created_at: Date;
};
