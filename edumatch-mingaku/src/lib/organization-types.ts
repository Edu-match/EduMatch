export const ORGANIZATION_TYPE_VALUES = [
  "teacher",
  "school-admin",
  "education-support",
  "company",
  "parent",
  "student",
  "other",
] as const;

export type OrganizationTypeValue = (typeof ORGANIZATION_TYPE_VALUES)[number];

export const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationTypeValue; label: string }[] = [
  { value: "teacher", label: "教員" },
  { value: "school-admin", label: "学校管理職" },
  { value: "education-support", label: "教育支援職（ICT支援員・事務など）" },
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
  const current = ORGANIZATION_TYPE_OPTIONS.find((o) => o.value === value)?.label;
  if (current) return current;
  // 旧値の後方互換
  const legacyMap: Record<string, string> = {
    elementary: "教員",
    "junior-high": "教員",
    "high-school": "教員",
    university: "教育支援職（ICT支援員・事務など）",
  };
  return legacyMap[value] ?? value;
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
