/** 掲示板（投稿ページ）の正規パス。special.* では /interop プレフィックス無しで動く。 */
export function interopBoardPath(
  subId: string,
  opts?: { topicId?: string; postId?: string },
): string {
  const base = opts?.topicId
    ? `/t/${subId}/topic/${opts.topicId}`
    : `/t/${subId}`;
  if (!opts?.postId) return base;
  const q = new URLSearchParams({ post: opts.postId });
  return `${base}?${q.toString()}`;
}
