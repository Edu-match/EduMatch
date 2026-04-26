/** プロフィール・井戸端会議バッジ用の職業・役職（value は DB に保存されるスラッグ） */
export const ORGANIZATION_TYPE_VALUES = [
  "elem-teacher",
  "jh-teacher",
  "hs-teacher",
  "kindergarten-teacher",
  "special-ed-teacher",
  "univ-faculty",
  "adjunct",
  "school-leader",
  "board-staff",
  "cram-instructor",
  "edtech-product",
  "sales-school",
  "ict-support",
  "librarian",
  "npo-edu",
  "freelance-edu",
  "parent",
  "student",
  "training-student",
  "company",
  "company-staff",
  "other",
  // 旧データ互換（ドロップダウンには出さないが organizationTypeLabel で解決）
  "elementary",
  "junior-high",
  "high-school",
  "university",
] as const;

export type OrganizationTypeValue = (typeof ORGANIZATION_TYPE_VALUES)[number];

export const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationTypeValue; label: string }[] = [
  { value: "elem-teacher", label: "小学校教員" },
  { value: "jh-teacher", label: "中学校教員" },
  { value: "hs-teacher", label: "高等学校教員" },
  { value: "kindergarten-teacher", label: "幼稚園教諭・保育士（教職）" },
  { value: "special-ed-teacher", label: "特別支援学校教員" },
  { value: "univ-faculty", label: "大学・高専の教員・研究者" },
  { value: "adjunct", label: "非常勤講師・TA・RA" },
  { value: "school-leader", label: "校長・教頭等（学校管理者）" },
  { value: "board-staff", label: "教育委員会・指導主事・行政職員" },
  { value: "cram-instructor", label: "学習塾・予備校講師" },
  { value: "edtech-product", label: "EdTech・教材・システム開発" },
  { value: "sales-school", label: "文教営業・学校向けサービス" },
  { value: "ict-support", label: "ICT支援員・情報教育担当" },
  { value: "librarian", label: "司書教諭・図書館職員" },
  { value: "npo-edu", label: "NPO・教育団体職員" },
  { value: "freelance-edu", label: "フリーランス（教育ライター・教室運営等）" },
  { value: "parent", label: "保護者" },
  { value: "student", label: "学生（大学等）" },
  { value: "training-student", label: "教職課程・教員志望の学生" },
  { value: "company", label: "企業・EdTech事業者（経営・管理職）" },
  { value: "company-staff", label: "企業・EdTech事業者（一般社員）" },
  { value: "other", label: "その他" },
];

/** 旧スラッグ → 表示ラベル（マイグレーション前データ・旧フォーラム用） */
const LEGACY_ORGANIZATION_TYPE_LABELS: Partial<Record<string, string>> = {
  elementary: "小学校教員",
  "junior-high": "中学校教員",
  "high-school": "高等学校教員",
  university: "大学・高専の教員・研究者",
};

/** 旧スラッグを新しい value に寄せる（フォーム初期値用） */
export function migrateOrganizationTypeSlug(raw: string | null | undefined): string {
  if (!raw) return "";
  const map: Record<string, OrganizationTypeValue> = {
    elementary: "elem-teacher",
    "junior-high": "jh-teacher",
    "high-school": "hs-teacher",
    university: "univ-faculty",
  };
  return map[raw] ?? raw;
}

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

export function organizationTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  const fromOptions = ORGANIZATION_TYPE_OPTIONS.find((o) => o.value === value)?.label;
  if (fromOptions) return fromOptions;
  const legacy = LEGACY_ORGANIZATION_TYPE_LABELS[value];
  if (legacy) return legacy;
  return value;
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
  "elem-teacher": "教員",
  "jh-teacher": "教員",
  "hs-teacher": "教員",
  "kindergarten-teacher": "教員",
  "special-ed-teacher": "教員",
  "univ-faculty": "専門家",
  adjunct: "専門家",
  "school-leader": "教員",
  "board-staff": "一般",
  "cram-instructor": "教員",
  "edtech-product": "企業",
  "sales-school": "企業",
  "ict-support": "教員",
  librarian: "教員",
  "npo-edu": "一般",
  "freelance-edu": "一般",
  parent: "一般",
  student: "学生",
  "training-student": "学生",
  company: "企業",
  "company-staff": "企業",
  other: "一般",
  elementary: "教員",
  "junior-high": "教員",
  "high-school": "教員",
  university: "専門家",
};

export function forumOccupationAvatarVisual(storedAuthorRole: string | null | undefined): ForumOccupationVisual {
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
