export const SITE_UPDATE_NOTIFICATION_KIND = "SITE_UPDATE";

/** DB に旧プレフィックスが残っている場合の表示用 */
export function formatInAppNotificationTitle(title: string): string {
  return title.replace(/^【運営お知らせ】/, "【運営からのお知らせ】");
}

export type InAppNotificationRow = {
  id: string;
  title: string;
  link: string | null;
  read: boolean;
  created_at: Date;
};
