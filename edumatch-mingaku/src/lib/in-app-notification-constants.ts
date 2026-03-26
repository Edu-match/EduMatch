export const SITE_UPDATE_NOTIFICATION_KIND = "SITE_UPDATE";

export type InAppNotificationRow = {
  id: string;
  title: string;
  link: string | null;
  read: boolean;
  created_at: Date;
};
