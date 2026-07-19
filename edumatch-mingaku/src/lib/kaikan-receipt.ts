// 受付番号を「数字のみ」で扱うためのユーティリティ。
// チケットtoken先頭8桁(16進)を10進数(最大10桁)に変換して表示し、照会時は逆変換して
// token 前方一致で検索する（＝可逆。DBスキーマ変更不要で既存の照会ロジックと両立）。

/** token先頭8hex → 数字のみ10桁の受付番号。 */
export function receiptNumber(token: string): string {
  const hex = token.replace(/[^a-fA-F0-9]/g, "").slice(0, 8).padStart(8, "0");
  const dec = parseInt(hex, 16) || 0;
  return String(dec).padStart(10, "0");
}

/** 表示用（5-5区切り。例: 12345-67890）。 */
export function receiptNumberDisplay(token: string): string {
  const n = receiptNumber(token);
  return `${n.slice(0, 5)}-${n.slice(5)}`;
}

/** 入力された受付番号（数字）→ token先頭8hexプレフィックス。数字でなければ null。 */
export function receiptDigitsToHexPrefix(input: string): string | null {
  const d = input.replace(/[^0-9]/g, "");
  if (!d) return null;
  const n = Number(d);
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return null;
  return n.toString(16).padStart(8, "0").toLowerCase();
}
