"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { OPERATOR_INFO } from "@/lib/operator-info";

/** 運営者情報を保存している SitePage のキー */
const KEY = "operator_info";

export type OperatorInfo = {
  sectionTitle: string;
  organizer: string;
  operator: string;
  established: string;
};

const DEFAULTS: OperatorInfo = {
  sectionTitle: OPERATOR_INFO.sectionTitle,
  organizer: OPERATOR_INFO.organizer,
  operator: OPERATOR_INFO.operator,
  established: OPERATOR_INFO.established,
};

/**
 * 運営者情報（主催・運営など）を取得する。
 * DB 未設定・テーブル未作成でも、定数のデフォルト値にフォールバックする。
 */
export async function getOperatorInfo(): Promise<OperatorInfo> {
  try {
    const row = await prisma.sitePage.findUnique({ where: { key: KEY } });
    if (!row?.body?.trim()) return DEFAULTS;
    const parsed = JSON.parse(row.body) as Partial<OperatorInfo>;
    return {
      sectionTitle: parsed.sectionTitle?.trim() || DEFAULTS.sectionTitle,
      organizer: parsed.organizer?.trim() || DEFAULTS.organizer,
      operator: parsed.operator?.trim() || DEFAULTS.operator,
      established: parsed.established?.trim() || DEFAULTS.established,
    };
  } catch (e) {
    console.error("getOperatorInfo error:", e);
    return DEFAULTS;
  }
}

/**
 * 運営者情報を保存する（管理者のみ）。
 */
export async function updateOperatorInfo(data: OperatorInfo) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return { success: false as const, error: "管理者権限が必要です" };
  }
  try {
    const body = JSON.stringify({
      sectionTitle: data.sectionTitle?.trim() ?? "",
      organizer: data.organizer?.trim() ?? "",
      operator: data.operator?.trim() ?? "",
      established: data.established?.trim() ?? "",
    });
    await prisma.sitePage.upsert({
      where: { key: KEY },
      create: { key: KEY, title: "運営者情報", body },
      update: { body },
    });
    return { success: true as const };
  } catch (e) {
    console.error("updateOperatorInfo error:", e);
    return { success: false as const, error: "保存に失敗しました" };
  }
}
