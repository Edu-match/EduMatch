export const ORGANIZATION_TYPE_VALUES = [
  "elementary",
  "junior-high",
  "high-school",
  "university",
  "company",
  "parent",
  "student",
  "other",
] as const;

export type OrganizationTypeValue = (typeof ORGANIZATION_TYPE_VALUES)[number];

export const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationTypeValue; label: string }[] = [
  { value: "elementary", label: "小学校" },
  { value: "junior-high", label: "中学校" },
  { value: "high-school", label: "高等学校" },
  { value: "university", label: "大学・専門学校" },
  { value: "company", label: "企業・EdTech事業者" },
  { value: "parent", label: "保護者" },
  { value: "student", label: "学生" },
  { value: "other", label: "その他" },
];

const ORGANIZATION_TYPE_VALUE_SET = new Set<string>(ORGANIZATION_TYPE_VALUES);

export const AGE_OPTIONS = [
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s", label: "60代以上" },
];

export function organizationTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return ORGANIZATION_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** 「その他」選択時の補足があれば括弧付きで表示 */
export function formatOrganizationTypeDisplay(
  type: string | null | undefined,
  other: string | null | undefined
): string {
  const base = organizationTypeLabel(type);
  if (type === "other" && other?.trim()) {
    return `${base}（${other.trim()}）`;
  }
  return base;
}

const MAX_FORUM_AUTHOR_ROLE_LEN = 120;

/** 教育のひろばの author_role 列に保存する文字列 */
export function computeForumAuthorRoleStorage(
  orgType: string | null | undefined,
  orgOther: string | null | undefined
): string {
  const value = orgType?.trim();
  if (!value) return "一般";
  if (value === "other" && orgOther?.trim()) {
    const formatted = formatOrganizationTypeDisplay("other", orgOther);
    return formatted.length > MAX_FORUM_AUTHOR_ROLE_LEN
      ? formatted.slice(0, MAX_FORUM_AUTHOR_ROLE_LEN)
      : formatted;
  }
  if (ORGANIZATION_TYPE_VALUE_SET.has(value)) return value;
  return "一般";
}

export type ForumOccupationVisual = "教員" | "学生" | "専門家" | "企業" | "一般" | "匿名";

export function forumOccupationAvatarVisual(role: string | null | undefined): ForumOccupationVisual {
  const value = (role ?? "").toLowerCase();
  if (!value) return "一般";
  if (value.includes("匿名")) return "匿名";
  if (value.includes("student") || value.includes("学生")) return "学生";
  if (
    value.includes("teacher") ||
    value.includes("faculty") ||
    value.includes("school") ||
    value.includes("教員")
  ) {
    return "教員";
  }
  if (value.includes("company") || value.includes("企業")) return "企業";
  if (value.includes("expert") || value.includes("専門")) return "専門家";
  return "一般";
}

export function forumOccupationBadgeText(role: string | null | undefined): string {
  const trimmed = role?.trim();
  if (!trimmed) return "一般";
  if (ORGANIZATION_TYPE_VALUE_SET.has(trimmed)) return organizationTypeLabel(trimmed);
  return trimmed;
}
