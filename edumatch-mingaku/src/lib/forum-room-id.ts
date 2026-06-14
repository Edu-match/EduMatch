/** コミュニティ内のユーザー作成ルーム用 ID プレフィックス */
export function communityUserRoomIdPrefix(
  categorySlug: string,
  subSlug: string
): string {
  return `room-${categorySlug}--${subSlug}--`;
}

/** フォーラム部屋 ID を生成（日本語名でも空 ID にならない） */
export function generateForumRoomId(
  name: string,
  opts?: { categorySlug?: string; subSlug?: string }
): string {
  const suffix = `${Date.now()}`;
  if (opts?.categorySlug && opts?.subSlug) {
    return `${communityUserRoomIdPrefix(opts.categorySlug, opts.subSlug)}${suffix}`;
  }
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .slice(0, 32);
  return ascii ? `${ascii}-${suffix}` : `room-${suffix}`;
}
