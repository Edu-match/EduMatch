/** AIファシリテーター返信を付けないサブカテゴリ（slug固定） */
export const INTEROP_NO_AI_REPLY_SLUGS = ["interop-speaker-qa"] as const;

export function isInteropAiReplyDisabled(sub: { slug?: string | null; name?: string | null }): boolean {
  if (sub.slug && (INTEROP_NO_AI_REPLY_SLUGS as readonly string[]).includes(sub.slug)) return true;
  const name = sub.name ?? "";
  if (name.includes("登壇者への質問")) return true;
  return false;
}
