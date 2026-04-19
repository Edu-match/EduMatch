/**
 * 各フォーラム部屋のスタイリッシュなSVGアイコン
 * 絵文字の代替として使用する
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

// 教育AI・DX — 回路とスパーク
export function IconAiDx({ size = 40, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* CPU chip outline */}
      <rect x="12" y="12" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="15" y="15" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
      {/* Pins */}
      <line x1="15" y1="12" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="12" x2="20" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="12" x2="25" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="28" x2="15" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="28" x2="20" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="28" x2="25" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="15" x2="9" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="20" x2="9" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="25" x2="9" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="15" x2="31" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="20" x2="31" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="25" x2="31" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Spark dot */}
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

// 探究・STEAM — フラスコ＋星
export function IconSteam({ size = 40, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Flask */}
      <path
        d="M16 10 L16 18 L11 26 C10 28 11 30 13 30 L27 30 C29 30 30 28 29 26 L24 18 L24 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <line x1="14" y1="10" x2="26" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Liquid */}
      <path
        d="M13.5 25 C14 23.5 16 22 20 22 C24 22 26 23.5 26.5 25 L27 26 C28 28 27 29.5 25.5 29.5 L14.5 29.5 C13 29.5 12 28 13 26 Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      {/* Bubbles */}
      <circle cx="18" cy="25.5" r="1" fill="currentColor" fillOpacity="0.6" />
      <circle cx="22" cy="26.5" r="0.75" fill="currentColor" fillOpacity="0.6" />
      {/* Star */}
      <path
        d="M31 8 L31.6 10 L33.5 10 L32 11.2 L32.6 13 L31 12 L29.4 13 L30 11.2 L28.5 10 L30.4 10 Z"
        fill="currentColor"
      />
    </svg>
  );
}

// 学校経営・働き方 — 建物＋上向き矢印
export function IconManagement({ size = 40, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Building */}
      <rect x="9" y="16" width="22" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Roof */}
      <path d="M7 17 L20 9 L33 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Door */}
      <rect x="17" y="24" width="6" height="8" rx="1" fill="currentColor" fillOpacity="0.25" />
      {/* Windows */}
      <rect x="11" y="19" width="5" height="4" rx="0.75" fill="currentColor" fillOpacity="0.25" />
      <rect x="24" y="19" width="5" height="4" rx="0.75" fill="currentColor" fillOpacity="0.25" />
      {/* Arrow up — top right */}
      <path d="M30 12 L30 7 M27.5 9.5 L30 7 L32.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 教育政策・制度 — 巻物＋スタンプ
export function IconPolicy({ size = 40, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Document */}
      <path
        d="M12 8 L12 32 C12 33 13 34 14 34 L26 34 C27 34 28 33 28 32 L28 14 L22 8 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <path d="M22 8 L22 14 L28 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      {/* Lines */}
      <line x1="16" y1="19" x2="24" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="22.5" x2="24" y2="22.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="26" x2="21" y2="26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Check stamp */}
      <circle cx="27" cy="28" r="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
      <path d="M24.5 28 L26.5 30 L29.5 26" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 多様な学び・支援 — 人々＋ハート
export function IconDiversity({ size = 40, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Person center */}
      <circle cx="20" cy="14" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M13 29 C13 24 16 22 20 22 C24 22 27 24 27 29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Person left */}
      <circle cx="11" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M6 30 C6 26.5 8 25 11 25 C12.5 25 13.5 25.5 14.5 26.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Person right */}
      <circle cx="29" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M34 30 C34 26.5 32 25 29 25 C27.5 25 26.5 25.5 25.5 26.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Heart */}
      <path
        d="M18.5 9 C18.5 7.5 19.25 7 20 7 C20.75 7 21.5 7.5 21.5 9 C21.5 10 20 11.5 20 11.5 C20 11.5 18.5 10 18.5 9 Z"
        fill="currentColor"
        fillOpacity="0.7"
      />
    </svg>
  );
}

// 国際・海外教育 — 地球儀
export function IconGlobal({ size = 40, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Globe circle */}
      <circle cx="20" cy="20" r="11" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Meridians */}
      <path d="M20 9 C16 13 16 27 20 31 C24 27 24 13 20 9 Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
      {/* Parallels */}
      <path d="M9.5 16 C12 14.5 28 14.5 30.5 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M9.5 24 C12 25.5 28 25.5 30.5 24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Equator */}
      <line x1="9" y1="20" x2="31" y2="20" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5" />
      {/* Stand */}
      <line x1="20" y1="31" x2="20" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="34" x2="24" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── ID → アイコンのマッピング ────────────────────────────

const ICON_MAP: Record<string, (props: IconProps) => React.ReactElement> = {
  "ai-dx": IconAiDx,
  steam: IconSteam,
  management: IconManagement,
  policy: IconPolicy,
  diversity: IconDiversity,
  global: IconGlobal,
};

// アクセントカラー（各部屋のテーマカラー）
export const ROOM_ACCENT_COLORS: Record<string, string> = {
  "ai-dx": "text-blue-600",
  steam: "text-emerald-600",
  management: "text-amber-600",
  policy: "text-slate-600",
  diversity: "text-pink-600",
  global: "text-cyan-600",
};

export const ROOM_BG_COLORS: Record<string, string> = {
  "ai-dx": "bg-blue-50 border-blue-100",
  steam: "bg-emerald-50 border-emerald-100",
  management: "bg-amber-50 border-amber-100",
  policy: "bg-slate-50 border-slate-100",
  diversity: "bg-pink-50 border-pink-100",
  global: "bg-cyan-50 border-cyan-100",
};

export function ForumRoomIcon({
  roomId,
  size = 40,
  className,
}: {
  roomId: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[roomId];
  const colorClass = ROOM_ACCENT_COLORS[roomId] ?? "text-primary";
  if (!Icon) return null;
  return <Icon size={size} className={className ?? colorClass} />;
}
