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
