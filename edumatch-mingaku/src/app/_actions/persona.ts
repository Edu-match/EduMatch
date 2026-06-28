"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { synthesizePersona, generateAvatarImage, type PersonaInput } from "@/lib/persona-ai";

const BUCKET_NAME = "media";

/**
 * クライアントから渡せるペルソナ生成引数。
 * referenceImage（Buffer）はサーバー専用のため、クライアントからは photoBase64（dataURL でも可）で受け取る。
 */
export type GeneratePersonaArgs = Omit<PersonaInput, "referenceImage"> & {
  /** 本人写真（任意）。data URL もしくは base64 文字列。 */
  photoBase64?: string;
};

/** dataURL / base64 文字列を PNG 等の Buffer に変換（最大 ~8MB）。 */
function base64ToBuffer(s?: string): Buffer | null {
  if (!s) return null;
  const m = s.match(/^data:[^;]+;base64,(.*)$/);
  const b64 = (m ? m[1] : s).trim();
  if (!b64) return null;
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0 || buf.length > 8 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

export type GeneratePersonaResult = {
  success: boolean;
  avatarUrl?: string;
  persona?: {
    displayName: string;
    personaPrompt: string;
    expertise: string[];
    valuesText: string;
  };
  error?: string;
};

/**
 * 登録時のマインド/価値観からAIアバターとパーソナルAIペルソナを生成する（全ユーザー公開）。
 *  1) マインドを要約してペルソナ設定＋画像プロンプトを合成
 *  2) アバター画像を生成して Supabase Storage に保存
 *  3) UserAiPersona を upsert（is_active は既定 false = 自動返信はオプトイン）
 *  4) Profile.avatar_url を生成画像に更新
 */
export async function generatePersonaAndAvatar(input: GeneratePersonaArgs): Promise<GeneratePersonaResult> {
  const profile = await getCurrentProfile().catch(() => null);
  if (!profile) return { success: false, error: "ログインが必要です" };
  // AIペルソナ作成は管理者のみ。
  if (profile.role !== "ADMIN") return { success: false, error: "AIペルソナの作成は管理者のみ利用できます" };

  const name = (input.name || profile.name || "").trim();
  if (!name) return { success: false, error: "名前が必要です" };

  const referenceImage = base64ToBuffer(input.photoBase64);

  // 1) ペルソナ合成
  const persona = await synthesizePersona({ ...input, name, referenceImage });
  if (!persona) {
    return { success: false, error: "ペルソナ生成に失敗しました（OPENAI_API_KEY を確認）" };
  }

  // 2) アバター画像生成（本人写真があれば似せて生成）
  const png = await generateAvatarImage(persona.imagePrompt, referenceImage);
  if (!png) {
    return { success: false, error: "アバター画像の生成に失敗しました" };
  }

  // 3) Storage 保存（Service Role でアップロード）
  let avatarUrl: string;
  try {
    const admin = createServiceRoleClient();
    const path = `ai-avatars/${profile.id}/${Date.now()}.png`;
    const { error: upErr } = await admin.storage
      .from(BUCKET_NAME)
      .upload(path, png, { cacheControl: "3600", upsert: true, contentType: "image/png" });
    if (upErr) {
      console.error("[persona] upload", upErr);
      return { success: false, error: "アバター画像の保存に失敗しました" };
    }
    avatarUrl = admin.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("[persona] storage", e);
    return { success: false, error: "ストレージ設定エラー" };
  }

  // 4) ペルソナ upsert＋Profile.avatar_url 更新
  try {
    await prisma.userAiPersona.upsert({
      where: { profile_id: profile.id },
      create: {
        profile_id: profile.id,
        display_name: persona.displayName,
        avatar_url: avatarUrl,
        persona_prompt: persona.personaPrompt,
        expertise: persona.expertise,
        values_text: persona.valuesText,
      },
      update: {
        display_name: persona.displayName,
        avatar_url: avatarUrl,
        persona_prompt: persona.personaPrompt,
        expertise: persona.expertise,
        values_text: persona.valuesText,
      },
    });
    await prisma.profile.update({
      where: { id: profile.id },
      data: { avatar_url: avatarUrl },
    });
  } catch (e) {
    console.error("[persona] db", e);
    return { success: false, error: "ペルソナ保存に失敗しました" };
  }

  return {
    success: true,
    avatarUrl,
    persona: {
      displayName: persona.displayName,
      personaPrompt: persona.personaPrompt,
      expertise: persona.expertise,
      valuesText: persona.valuesText,
    },
  };
}
