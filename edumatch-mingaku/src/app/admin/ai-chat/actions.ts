"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/app/_actions/activity-log";

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
    void logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: "UPDATE",
      targetType: "AI_CHAT_PROMPT",
      targetId: mode,
      targetTitle: `${mode} プロンプト`,
      detail: "AIチャットのシステムプロンプトを保存",
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
    const profile = await requireAdmin();
    await prisma.systemPromptOverride.deleteMany({ where: { mode } });
    void logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: "DELETE",
      targetType: "AI_CHAT_PROMPT",
      targetId: mode,
      targetTitle: `${mode} プロンプト`,
      detail: "AIチャットのシステムプロンプトをリセット",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}
