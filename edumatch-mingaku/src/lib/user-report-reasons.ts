export const USER_REPORT_REASON_CODES = [
  "HARASSMENT",
  "SPAM",
  "INAPPROPRIATE",
  "PRIVACY",
  "OTHER",
] as const;

export type UserReportReasonCode = (typeof USER_REPORT_REASON_CODES)[number];

export const USER_REPORT_REASON_LABELS: Record<UserReportReasonCode, string> = {
  HARASSMENT: "嫌がらせ・誹謗中傷",
  SPAM: "スパム・宣伝",
  INAPPROPRIATE: "不適切な内容",
  PRIVACY: "プライバシー侵害",
  OTHER: "その他",
};

export const USER_REPORT_CONTEXT_KINDS = ["comment", "profile", "article", "other"] as const;
export type UserReportContextKind = (typeof USER_REPORT_CONTEXT_KINDS)[number];
