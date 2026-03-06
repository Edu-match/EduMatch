/**
 * 日本時間（JST）で日付をフォーマットするユーティリティ
 * サーバーがUTC等で動作している場合でも、正しい日本時間で表示する
 */
const JST = "Asia/Tokyo" as const;

export function formatDateInJST(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  return date.toLocaleDateString("ja-JP", { ...options, timeZone: JST });
}

export function formatDateShortInJST(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: JST,
  });
}

/** 日付のみ（時刻なし）でフォーマット */
export function formatDateOnlyInJST(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: JST,
  });
}
