/**
 * フォーラムバブルビューの静的レイアウト定義
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
 * 各部屋のバブル配置（PC / 広い画面）
 * 意図的にやや非対称な散らばり配置にする。
 */
export const BUBBLE_POSITIONS: BubblePosition[] = [
  { id: "ai-lesson",        cx: 22, cy: 27 }, // 左上
  { id: "giga-school",      cx: 52, cy: 16 }, // 上中央
  { id: "diverse-learning", cx: 81, cy: 34 }, // 右上
  { id: "teacher-work",     cx: 34, cy: 68 }, // 左下
  { id: "education-gap",    cx: 66, cy: 72 }, // 右下
  { id: "ai-literacy",      cx: 13, cy: 73 }, // 左端下
];

/**
 * モバイル用バブル配置（2列×3行、縦長コンテナ）
 */
export const BUBBLE_POSITIONS_MOBILE: BubblePosition[] = [
  { id: "ai-lesson",        cx: 27, cy: 15 },
  { id: "giga-school",      cx: 73, cy: 15 },
  { id: "diverse-learning", cx: 27, cy: 48 },
  { id: "teacher-work",     cx: 73, cy: 48 },
  { id: "education-gap",    cx: 27, cy: 81 },
  { id: "ai-literacy",      cx: 73, cy: 81 },
];

/**
 * 同カテゴリ部屋同士を繋ぐ接続線。
 * 1部屋あたり最大2本まで。
 */
export const BUBBLE_CONNECTIONS: BubbleConnection[] = [
  { from: "ai-lesson",     to: "ai-literacy" },    // どちらもAI
  { from: "ai-lesson",     to: "teacher-work" },   // 授業×働き方
  { from: "giga-school",   to: "education-gap" },  // デジタルデバイド
  { from: "giga-school",   to: "teacher-work" },   // 学校テクノロジー
  { from: "diverse-learning", to: "education-gap" }, // 格差と多様性
];

/**
 * 投稿数からバブルサイズ（px）を決定する。
 * PC / モバイルでそれぞれのサイズを持つ。
 */
export function getBubbleSize(postCount: number): { pc: number; mobile: number } {
  if (postCount >= 21) return { pc: 148, mobile: 118 };
  if (postCount >= 6)  return { pc: 116, mobile: 94 };
  return                      { pc: 88,  mobile: 72 };
}

/**
 * 直近24時間以内に投稿があるか（バブルのpulseアニメーション判定）
 */
export function isRoomActive(lastPostedAt: string): boolean {
  const diff = Date.now() - new Date(lastPostedAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
}
