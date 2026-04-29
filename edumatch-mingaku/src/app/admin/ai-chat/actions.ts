"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    throw new Error("管理者権限が必要です");
  }
  return profile;
}

export type ChatModeKey = "navigator" | "debate" | "discussion";

export async function getSystemPromptOverrides(): Promise<Record<string, string>> {
  const rows = await prisma.systemPromptOverride.findMany();
  return Object.fromEntries(rows.map((r) => [r.mode, r.content]));
}

export async function saveSystemPromptOverride(
  mode: ChatModeKey,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const profile = await requireAdmin();
    await prisma.systemPromptOverride.upsert({
      where: { mode },
      update: { content, updated_by: profile.id },
      create: { mode, content, updated_by: profile.id },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
}

export async function deleteSystemPromptOverride(
  mode: ChatModeKey
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.systemPromptOverride.deleteMany({ where: { mode } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}
