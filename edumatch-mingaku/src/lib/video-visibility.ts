import type { VideoVisibility } from "@prisma/client";

export const VIDEO_VISIBILITY_LABELS: Record<VideoVisibility, string> = {
  PUBLIC: "公開",
  UNLISTED: "限定公開",
  PRIVATE: "非公開",
};

/** 一覧ページに表示するか（完全公開のみ） */
export function isVideoListedPublicly(visibility: VideoVisibility): boolean {
  return visibility === "PUBLIC";
}

/** ログイン不要で URL 直アクセス可能か（公開 + 限定公開） */
export function isVideoViewableByVisitor(
  visibility: VideoVisibility,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  return visibility === "PUBLIC" || visibility === "UNLISTED";
}

/** コメント投稿可能か（閲覧可能と同条件） */
export function canCommentOnVideo(
  visibility: VideoVisibility,
  isAdmin: boolean
): boolean {
  return isVideoViewableByVisitor(visibility, isAdmin);
}
