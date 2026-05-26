import type { ServiceSortOrderTier } from "@prisma/client";

/** 無料掲載（Supabase の sort_order = なし） */
export function isFreeServiceSortOrder(
  sortOrder: ServiceSortOrderTier | string | null | undefined
): boolean {
  return sortOrder === "NONE" || sortOrder === "なし";
}

/** DB 保存用: 無料枠は常に false */
export function resolveShowMaterialRequestButton(
  sortOrder: ServiceSortOrderTier | string | null | undefined,
  requested?: boolean | null
): boolean {
  if (isFreeServiceSortOrder(sortOrder)) return false;
  return requested ?? true;
}

/** UI 表示用 */
export function shouldShowMaterialRequestButton(
  sortOrder: ServiceSortOrderTier | string | null | undefined,
  showMaterialRequestButton: boolean | null | undefined
): boolean {
  if (isFreeServiceSortOrder(sortOrder)) return false;
  return showMaterialRequestButton !== false;
}
