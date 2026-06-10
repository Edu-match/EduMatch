import { isForumHot, type ForumActivityStats } from "@/lib/forum-hot";

export type InteropActivityStats = ForumActivityStats & {
  subCategoryId?: string;
  categoryId?: string;
};

/** 特設掲示板向けの「盛り上がり」判定（本番フォーラムより閾値をやや低く） */
export function isInteropHot(stats: ForumActivityStats): boolean {
  const posts = stats.postCount ?? 0;
  if (posts >= 3) return true;
  if (posts >= 2 && (stats.participantCount ?? 0) >= 2) return true;
  if (stats.lastPostedAt && posts >= 1) {
    const hours = (Date.now() - new Date(stats.lastPostedAt).getTime()) / 3_600_000;
    if (hours <= 12 && posts >= 2) return true;
  }
  return isForumHot(stats);
}

/** 大カテゴリバブルの直径ブースト（px） */
export function computeCategoryActivityDiameter(base: number, stats: ForumActivityStats): number {
  const activity = stats.postCount + (stats.participantCount ?? 0);
  const boost = Math.round(Math.sqrt(Math.max(0, activity)) * 7);
  return Math.min(Math.round(base * 1.42), base + boost);
}

/** サブカテゴリ軌道玉の直径（px）。盛り上がりルームは1.5倍まで大きくなる */
export function computeSubOrbDiameter(stats: ForumActivityStats): number {
  const activity = stats.postCount + (stats.participantCount ?? 0) * 0.6;
  const base = Math.min(152, Math.max(96, 96 + Math.round(Math.sqrt(Math.max(0, activity)) * 11)));
  if (isInteropHot(stats)) return Math.min(210, Math.round(base * 1.5));
  return base;
}

export function formatActivityHint(stats: ForumActivityStats): string | undefined {
  if (stats.postCount <= 0) return undefined;
  if (isInteropHot(stats)) return `🔥 ${stats.postCount}件`;
  return `${stats.postCount}件`;
}
