// AIペルソナ／アバター生成のための選択肢（クライアント・サーバー共通で利用）。

// MBTIの説明リンク（非認知層の離脱防止）。
export const MBTI_GUIDE_URL = "https://www.16personalities.com/ja";

// 16personalities 風の4グループ配色（分析家=紫 / 外交官=緑 / 番人=青 / 探検家=黄）。
export type MbtiGroup = "analyst" | "diplomat" | "sentinel" | "explorer";

export function mbtiGroup(code: string): MbtiGroup {
  if (code.includes("NT")) return "analyst";
  if (code.includes("NF")) return "diplomat";
  if (code[1] === "S" && code[3] === "J") return "sentinel";
  return "explorer";
}

export const MBTI_GROUP_STYLE: Record<MbtiGroup, { on: string; off: string; label: string }> = {
  analyst: { on: "border-violet-500 bg-violet-500 text-white shadow-sm", off: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100", label: "分析家" },
  diplomat: { on: "border-emerald-500 bg-emerald-500 text-white shadow-sm", off: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100", label: "外交官" },
  sentinel: { on: "border-sky-500 bg-sky-500 text-white shadow-sm", off: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100", label: "番人" },
  explorer: { on: "border-amber-500 bg-amber-500 text-white shadow-sm", off: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100", label: "探検家" },
};

export const PERSONA_MBTI_OPTIONS: { code: string; name: string }[] = [
  { code: "INTJ", name: "建築家" }, { code: "INTP", name: "論理学者" },
  { code: "ENTJ", name: "指揮官" }, { code: "ENTP", name: "討論者" },
  { code: "INFJ", name: "提唱者" }, { code: "INFP", name: "仲介者" },
  { code: "ENFJ", name: "主人公" }, { code: "ENFP", name: "運動家" },
  { code: "ISTJ", name: "管理者" }, { code: "ISFJ", name: "擁護者" },
  { code: "ESTJ", name: "幹部" }, { code: "ESFJ", name: "領事" },
  { code: "ISTP", name: "巨匠" }, { code: "ISFP", name: "冒険家" },
  { code: "ESTP", name: "起業家" }, { code: "ESFP", name: "エンターテイナー" },
];

export const AVATAR_TEMPLATES = [
  "/avatars/templates/1.svg",
  "/avatars/templates/2.svg",
  "/avatars/templates/3.svg",
  "/avatars/templates/4.svg",
] as const;
