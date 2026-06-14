/** フォーラムカテゴリ用 slug（日本語を含む Unicode 文字を保持） */
export function forumSlugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base.slice(0, 80);
}

export function uniqueForumSlug(base: string, fallbackPrefix: string): string {
  const slug = forumSlugify(base);
  if (slug) return slug;
  return `${fallbackPrefix}-${Date.now()}`;
}
