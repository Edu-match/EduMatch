import { prisma } from "@/lib/prisma";
import {
  DEFAULT_INTEROP_SETTINGS,
  type InteropSettings,
} from "@/lib/interop-settings";

/** 設定を取得（テーブル未作成やキー欠落時はデフォルトで補完）。サーバー専用。 */
export async function getInteropSettings(): Promise<InteropSettings> {
  try {
    const row = await prisma.interopSetting.findUnique({ where: { key: "site" } });
    const stored = (row?.value ?? {}) as Partial<InteropSettings>;
    return { ...DEFAULT_INTEROP_SETTINGS, ...stored };
  } catch {
    return DEFAULT_INTEROP_SETTINGS;
  }
}
