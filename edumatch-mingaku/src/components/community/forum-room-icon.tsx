/**
 * 各フォーラム部屋のスタイリッシュなSVGアイコン
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

// AI×授業設計 — 脳＋回路
export function IconAiLesson({ size = 40, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* CPU chip */}
      <rect x="12" y="12" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="15" y="15" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
      {/* Pins top/bottom */}
      <line x1="15" y1="12" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="12" x2="20" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="12" x2="25" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="28" x2="15" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="28" x2="20" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="28" x2="25" y2="31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Pins left/right */}
      <line x1="12" y1="15" x2="9" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="20" x2="9" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="25" x2="9" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="15" x2="31" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="20" x2="31" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="25" x2="31" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

// GIGAスクールのリアル — 端末＋Wifi
export function IconGigaSchool({ size = 40, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Tablet */}
      <rect x="9" y="13" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="11" y="15" width="18" height="11" rx="1" fill="currentColor" fillOpacity="0.12" />
      {/* Home button */}
      <circle cx="20" cy="31.5" r="1" fill="currentColor" fillOpacity="0.5" />
      {/* Wifi arcs above tablet */}
      <path d="M15 9.5 C17 7.5 23 7.5 25 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M17.5 11.5 C18.8 10.2 21.2 10.2 22.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="13" r="0.8" fill="currentColor" />
    </svg>
  );
}

// 不登校と多様な学び — 人々＋ハート
export function IconDiverseLearning({ size = 40, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
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
      <path d="M18.5 9 C18.5 7.5 19.25 7 20 7 C20.75 7 21.5 7.5 21.5 9 C21.5 10 20 11.5 20 11.5 C20 11.5 18.5 10 18.5 9 Z" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}

// 教員の働き方とテクノロジー — 時計＋歯車
export function IconTeacherWork({ size = 40, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Clock face */}
      <circle cx="18" cy="22" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="18" cy="22" r="1.2" fill="currentColor" />
      {/* Clock hands */}
      <line x1="18" y1="22" x2="18" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="22" x2="23" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Gear — top right */}
      <circle cx="30" cy="12" r="4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="30" cy="12" r="1.5" fill="currentColor" fillOpacity="0.3" />
      <line x1="30" y1="7" x2="30" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="30" y1="15.5" x2="30" y2="17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="25" y1="12" x2="26.5" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="33.5" y1="12" x2="35" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// 教育格差とEdTech — 棒グラフ＋矢印
export function IconEducationGap({ size = 40, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Bar chart */}
      <rect x="9" y="24" width="5" height="8" rx="1" fill="currentColor" fillOpacity="0.5" />
      <rect x="16" y="18" width="5" height="14" rx="1" fill="currentColor" fillOpacity="0.65" />
      <rect x="23" y="13" width="5" height="19" rx="1" fill="currentColor" fillOpacity="0.8" />
      {/* Baseline */}
      <line x1="8" y1="32" x2="32" y2="32" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* Arrow upward right */}
      <path d="M28 10 L33 5 M29 5 L33 5 L33 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 子どもとAIリテラシー — 本＋AI思考バブル
export function IconAiLiteracy({ size = 40, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect width="40" height="40" rx="10" fill="currentColor" fillOpacity="0.1" />
      {/* Open book */}
      <path d="M8 28 L8 14 C8 13 9 12 10 12 L19 12 L19 28 Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d="M32 28 L32 14 C32 13 31 12 30 12 L21 12 L21 28 Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <line x1="20" y1="12" x2="20" y2="28" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" />
      {/* Text lines on pages */}
      <line x1="11" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="11" y1="19" x2="17" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="23" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
      {/* AI thought bubble top right */}
      <circle cx="30" cy="9" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="34" cy="11" r="1.2" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="36" cy="13" r="0.7" fill="currentColor" fillOpacity="0.5" />
      <text x="28.5" y="10.5" fontSize="4" fill="currentColor" fontWeight="bold">AI</text>
    </svg>
  );
}

// ─── 旧アイコン（後方互換用） ─────────────────────────────
export function IconAiDx(props: IconProps) { return <IconAiLesson {...props} />; }
export function IconSteam(props: IconProps) { return <IconGigaSchool {...props} />; }
export function IconManagement(props: IconProps) { return <IconTeacherWork {...props} />; }
export function IconPolicy(props: IconProps) { return <IconEducationGap {...props} />; }
export function IconDiversity(props: IconProps) { return <IconDiverseLearning {...props} />; }
export function IconGlobal(props: IconProps) { return <IconAiLiteracy {...props} />; }

// ─── ID → アイコン のマッピング ──────────────────────────

const ICON_MAP: Record<string, (props: IconProps) => React.ReactElement> = {
  // 新ルームID
  "ai-lesson":        IconAiLesson,
  "giga-school":      IconGigaSchool,
  "diverse-learning": IconDiverseLearning,
  "teacher-work":     IconTeacherWork,
  "education-gap":    IconEducationGap,
  "ai-literacy":      IconAiLiteracy,
  // 旧ルームID（後方互換）
  "ai-dx":    IconAiLesson,
  steam:      IconGigaSchool,
  management: IconTeacherWork,
  policy:     IconEducationGap,
  diversity:  IconDiverseLearning,
  global:     IconAiLiteracy,
};

export const ROOM_ACCENT_COLORS: Record<string, string> = {
  "ai-lesson":        "text-blue-600",
  "giga-school":      "text-amber-600",
  "diverse-learning": "text-pink-600",
  "teacher-work":     "text-emerald-600",
  "education-gap":    "text-slate-600",
  "ai-literacy":      "text-violet-600",
  // 旧ルームID（後方互換）
  "ai-dx":    "text-blue-600",
  steam:      "text-emerald-600",
  management: "text-amber-600",
  policy:     "text-slate-600",
  diversity:  "text-pink-600",
  global:     "text-cyan-600",
};

export const ROOM_BG_COLORS: Record<string, string> = {
  "ai-lesson":        "bg-blue-50 border-blue-100",
  "giga-school":      "bg-amber-50 border-amber-100",
  "diverse-learning": "bg-pink-50 border-pink-100",
  "teacher-work":     "bg-emerald-50 border-emerald-100",
  "education-gap":    "bg-slate-50 border-slate-100",
  "ai-literacy":      "bg-violet-50 border-violet-100",
  // 旧ルームID（後方互換）
  "ai-dx":    "bg-blue-50 border-blue-100",
  steam:      "bg-emerald-50 border-emerald-100",
  management: "bg-amber-50 border-amber-100",
  policy:     "bg-slate-50 border-slate-100",
  diversity:  "bg-pink-50 border-pink-100",
  global:     "bg-cyan-50 border-cyan-100",
};

// バブルビュー用のグラデーション背景色
export const ROOM_BUBBLE_COLORS: Record<string, { from: string; to: string; border: string; text: string }> = {
  "ai-lesson":        { from: "from-blue-100",   to: "to-blue-50",   border: "border-blue-200",   text: "text-blue-700" },
  "giga-school":      { from: "from-amber-100",  to: "to-amber-50",  border: "border-amber-200",  text: "text-amber-700" },
  "diverse-learning": { from: "from-pink-100",   to: "to-pink-50",   border: "border-pink-200",   text: "text-pink-700" },
  "teacher-work":     { from: "from-emerald-100",to: "to-emerald-50",border: "border-emerald-200",text: "text-emerald-700" },
  "education-gap":    { from: "from-slate-100",  to: "to-slate-50",  border: "border-slate-200",  text: "text-slate-700" },
  "ai-literacy":      { from: "from-violet-100", to: "to-violet-50", border: "border-violet-200", text: "text-violet-700" },
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
