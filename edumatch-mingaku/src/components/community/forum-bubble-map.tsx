/**
 * フォーラムトピックマップの静的レイアウト定義
 *
 * cx/cy は親コンテナに対するパーセンテージ (0-100)。
 * SVG の viewBox="0 0 100 100" と合わせることで
 * 接続線の座標と完全に一致する。
 */

export type BubblePosition = {
  id: string;
  /** コンテナ幅に対する横位置 % */
  cx: number;
  /** コンテナ高さに対する縦位置 % */
  cy: number;
};

export type BubbleConnection = {
  from: string;
  to: string;
};

/**
 * 各部屋のカード配置（PC / 広い画面）
 * 上下2段の緩やかなジグザグ。余白を多めに取り、リズムを揃える。
 */
export const BUBBLE_POSITIONS: BubblePosition[] = [
  { id: "ai-lesson",        cx: 18, cy: 32 }, // 上段-左
  { id: "giga-school",      cx: 50, cy: 22 }, // 上段-中
  { id: "diverse-learning", cx: 82, cy: 32 }, // 上段-右
  { id: "teacher-work",     cx: 18, cy: 70 }, // 下段-左
  { id: "education-gap",    cx: 50, cy: 80 }, // 下段-中
  { id: "ai-literacy",      cx: 82, cy: 70 }, // 下段-右
];

/**
 * モバイル用配置（縦に並べる）
 */
export const BUBBLE_POSITIONS_MOBILE: BubblePosition[] = [
  { id: "ai-lesson",        cx: 50, cy: 10 },
  { id: "giga-school",      cx: 50, cy: 25 },
  { id: "diverse-learning", cx: 50, cy: 42 },
  { id: "teacher-work",     cx: 50, cy: 58 },
  { id: "education-gap",    cx: 50, cy: 75 },
  { id: "ai-literacy",      cx: 50, cy: 90 },
];

/**
 * 同カテゴリ部屋同士を繋ぐ接続線。
 * 1部屋あたり最大2本まで。
 */
export const BUBBLE_CONNECTIONS: BubbleConnection[] = [
  { from: "ai-lesson",        to: "ai-literacy" },
  { from: "ai-lesson",        to: "teacher-work" },
  { from: "giga-school",      to: "education-gap" },
  { from: "diverse-learning", to: "education-gap" },
];

/**
 * 投稿数からカードサイズ感（縦の高さpx）を決める。
 * 控えめな差にとどめる。
 */
export function getBubbleSize(postCount: number): { pc: number; mobile: number } {
  if (postCount >= 21) return { pc: 132, mobile: 96 };
  if (postCount >= 6)  return { pc: 116, mobile: 88 };
  return                      { pc: 104, mobile: 80 };
}

/**
 * 直近24時間以内に投稿があるか
 */
export function isRoomActive(lastPostedAt: string): boolean {
  const diff = Date.now() - new Date(lastPostedAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}
