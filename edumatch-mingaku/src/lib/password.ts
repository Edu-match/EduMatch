/**
 * パスワード条件：8文字以上、大文字、小文字、数字
 * 不足している条件のラベルを返す
 */
export const PASSWORD_CONDITION_LABELS = [
  "8文字以上",
  "大文字を含む",
  "小文字を含む",
  "数字を含む",
] as const;

export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (!password || password.length < 8) errors.push("8文字以上");
  if (!/[A-Z]/.test(password)) errors.push("大文字を含む");
  if (!/[a-z]/.test(password)) errors.push("小文字を含む");
  if (!/[0-9]/.test(password)) errors.push("数字を含む");
  return errors;
}

export function getPasswordErrorMessage(password: string): string | null {
  const errors = getPasswordErrors(password);
  if (errors.length === 0) return null;
  return "パスワードは以下の条件を満たしてください：\n• " + errors.join("\n• ");
}
