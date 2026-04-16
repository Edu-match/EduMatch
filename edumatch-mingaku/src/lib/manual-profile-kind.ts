/**
 * Profile.manual_profile_kind（Table Editor 用）を最優先し、
 * 未設定のときだけ拡張行・role で推論する。
 */

/**
 * UI・ログイン種別用: 企業（事業者）として扱うか。
 */
export function effectiveIsCorporateProfile(
  role: string,
  manualProfileKind: string | null | undefined,
  hasCorporateProfileRow: boolean
): boolean {
  if (role === "ADMIN") return false;
  if (manualProfileKind === "general") return false;
  if (manualProfileKind === "corporate") return true;
  return hasCorporateProfileRow || role === "PROVIDER";
}

/**
 * updateProfile が書き込む先（General / Corporate 拡張）。
 */
export function resolveProfileExtensionTarget(
  role: string,
  manualProfileKind: string | null | undefined,
  hasGeneralProfile: boolean,
  hasCorporateProfile: boolean,
  registrationKind: "general" | "service_business" | null
): "general" | "service_business" {
  if (role === "ADMIN") return "general";
  if (manualProfileKind === "general") return "general";
  if (manualProfileKind === "corporate") return "service_business";
  if (hasCorporateProfile) return "service_business";
  if (hasGeneralProfile) return "general";
  if (registrationKind === "service_business") return "service_business";
  return "general";
}
