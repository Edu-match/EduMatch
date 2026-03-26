export const ORGANIZATION_TYPE_VALUES = [
  "elementary",
  "junior-high",
  "high-school",
  "university",
  "company",
  "other",
] as const;

export type OrganizationTypeValue = (typeof ORGANIZATION_TYPE_VALUES)[number];

export const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationTypeValue; label: string }[] = [
  { value: "elementary", label: "小学校" },
  { value: "junior-high", label: "中学校" },
  { value: "high-school", label: "高等学校" },
  { value: "university", label: "大学・専門学校" },
  { value: "company", label: "企業・EdTech事業者" },
  { value: "other", label: "その他" },
];

export function organizationTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return ORGANIZATION_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
