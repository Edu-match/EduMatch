/** プロフィール・井戸端会議バッジ用の職業・役職（value は DB に保存されるスラッグ） */
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

const ORG_VALUE_SET = new Set<string>(ORGANIZATION_TYPE_VALUES);

export function isOrganizationTypeSlug(value: string | null | undefined): boolean {
  return !!value && ORG_VALUE_SET.has(value);
}

export const AGE_OPTIONS = [
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s", label: "60代以上" },
];

/** 旧スラッグを新しい value に寄せる（フォーム初期値用） */
export function migrateOrganizationTypeSlug(raw: string | null | undefined): string {
  if (!raw) return "";
  const map: Record<string, OrganizationTypeValue> = {
    elementary: "teacher",
    "junior-high": "teacher",
    "high-school": "teacher",
    university: "education-support",
  };
  return map[raw] ?? raw;
}

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

const MAX_FORUM_AUTHOR_ROLE_LEN = 120;

/**
 * フォーラムの author_role 列に保存する文字列（スラッグ、または「その他（補足）」の整形文）
 */
export function computeForumAuthorRoleStorage(
  orgType: string | null | undefined,
  orgOther: string | null | undefined
): string {
  const t = orgType?.trim();
  if (!t) return "一般";
  if (t === "other" && orgOther?.trim()) {
    const formatted = formatOrganizationTypeDisplay("other", orgOther);
    return formatted.length > MAX_FORUM_AUTHOR_ROLE_LEN
      ? formatted.slice(0, MAX_FORUM_AUTHOR_ROLE_LEN)
      : formatted;
  }
  if (ORG_VALUE_SET.has(t)) return t;
  return "一般";
}

/** 井戸端会議バッジに表示する文言（DBの author_role から） */
export function forumOccupationBadgeText(storedAuthorRole: string | null | undefined): string {
  const v = storedAuthorRole?.trim();
  if (v === "匿名") return "匿名";
  if (!v) return "一般";
  if (ORG_VALUE_SET.has(v)) {
    return organizationTypeLabel(v);
  }
  if (v === "教員" || v === "学生" || v === "専門家" || v === "企業" || v === "一般") {
    return v;
  }
  return v;
}

/** アバター・バッジの色分け（旧 AuthorRole 系と揃える） */
export type ForumOccupationVisual = "教員" | "学生" | "専門家" | "企業" | "一般" | "匿名";

const SLUG_TO_VISUAL: Partial<Record<string, ForumOccupationVisual>> = {
  teacher: "教員",
  "school-admin": "教員",
  "education-support": "一般",
  parent: "一般",
  student: "学生",
  company: "企業",
  other: "一般",
  elementary: "教員",
  "junior-high": "教員",
  "high-school": "教員",
  university: "専門家",
};

export function forumOccupationAvatarVisual(
  storedAuthorRole: string | null | undefined
): ForumOccupationVisual {
  const v = storedAuthorRole?.trim();
  if (v === "匿名") return "匿名";
  if (!v) return "一般";
  const bySlug = SLUG_TO_VISUAL[v];
  if (bySlug) return bySlug;
  if (v === "教員" || v === "学生" || v === "専門家" || v === "企業" || v === "一般") {
    return v as ForumOccupationVisual;
  }
  return "一般";
}
