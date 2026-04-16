import type { Prisma } from "@prisma/client";

/** Supabase user_metadata.registration_kind と対応 */
export type RegistrationKind = "general" | "service_business";

type ExtensionTx = Pick<
  Prisma.TransactionClient,
  "generalProfile" | "corporateProfile"
>;

/**
 * 新規登録完了時に一度だけ呼ぶ想定。
 * GeneralProfile と CorporateProfile のどちらか一方だけを残す（登録種別に応じて空行を作成）。
 * Profile.manual_profile_kind は呼び出し側の upsert/create と合わせて設定すること。
 */
export async function syncExtensionTablesForRegistrationKind(
  tx: ExtensionTx,
  userId: string,
  kind: RegistrationKind
): Promise<void> {
  if (kind === "service_business") {
    await tx.corporateProfile.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });
    await tx.generalProfile.deleteMany({ where: { id: userId } });
  } else {
    await tx.generalProfile.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });
    await tx.corporateProfile.deleteMany({ where: { id: userId } });
  }
}
