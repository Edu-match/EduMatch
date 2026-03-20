import type { HomeNewsTab } from "@prisma/client";

/** トップ「トピックス」のタブと記事投稿・管理画面で共通（NONE = 「すべて」に表示される分類） */
export const HOME_TOPICS_TAB_OPTIONS: ReadonlyArray<{
  value: "NONE" | "DOMESTIC" | "INTERNATIONAL";
  label: string;
}> = [
  { value: "NONE", label: "すべて" },
  { value: "DOMESTIC", label: "国内のニュース" },
  { value: "INTERNATIONAL", label: "世界のニュース" },
];

/** 管理画面・フォームで WEEKLY 等を3分類に寄せる（DBのレガシー値対策） */
export function topicsAdminTabValue(tab: HomeNewsTab): "NONE" | "DOMESTIC" | "INTERNATIONAL" {
  if (tab === "DOMESTIC" || tab === "INTERNATIONAL") return tab;
  return "NONE";
}
