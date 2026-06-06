/** 井戸端の「ホット」判定（議論が活発な話題） */
export type ForumActivityStats = {
  postCount: number;
  participantCount?: number;
  lastPostedAt?: string | null;
};

export function computeForumHotScore(stats: ForumActivityStats): number {
  const posts = stats.postCount ?? 0;
  const participants = stats.participantCount ?? 0;
  let score = posts * 1.5 + participants * 2;

  if (stats.lastPostedAt) {
    const hours = (Date.now() - new Date(stats.lastPostedAt).getTime()) / 3_600_000;
    if (hours <= 24) score += 8;
    else if (hours <= 72) score += 4;
    else if (hours <= 168) score += 2;
  }

  return score;
}

export function isForumHot(stats: ForumActivityStats): boolean {
  if (stats.postCount >= 5) return true;
  if (stats.postCount >= 2 && stats.participantCount && stats.participantCount >= 2) {
    return true;
  }
  return computeForumHotScore(stats) >= 6;
}
