import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_INTEROP_SETTINGS,
  type InteropSettings,
} from "@/lib/interop-settings";
import { getInteropSettings } from "@/lib/interop-settings.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** サイト設定の取得（公開） */
export async function GET() {
  const settings = await getInteropSettings();
  return NextResponse.json({ settings });
}

/** サイト設定の更新（ADMIN のみ） */
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<InteropSettings>;
  const current = await getInteropSettings();

  // 既知のキーのみ受け付ける（不要なキーの混入を防ぐ）
  const next: InteropSettings = { ...current };
  for (const key of Object.keys(DEFAULT_INTEROP_SETTINGS) as (keyof InteropSettings)[]) {
    if (key in body && body[key] !== undefined) {
      // @ts-expect-error 型は実行時に保証
      next[key] = body[key];
    }
  }

  await prisma.interopSetting.upsert({
    where: { key: "site" },
    create: { key: "site", value: next },
    update: { value: next },
  });

  return NextResponse.json({ settings: next });
}
