"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { generatePersonaReplyText } from "@/lib/persona-reply";
import { synthesizePersona, generateAvatarImage } from "@/lib/persona-ai";
import { checkHistoricalPersonaLegal, researchHistoricalFigure, type LegalVerdict } from "@/lib/historical-persona";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";

export type HistoricalPersonaResult = {
  ok: boolean;
  error?: string;
  legal?: LegalVerdict;
  persona?: { id: string; name: string; expertise: string[]; valuesText: string; avatarUrl: string | null };
};

/**
 * 歴史上の人物名から、AI法的チェック→ネット検索→ペルソナ＋オリジナルイラスト生成→保存。
 * blocked 判定の場合は生成せず理由を返す。
 */
export async function createHistoricalPersona(name: string): Promise<HistoricalPersonaResult> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const trimmed = (name || "").trim();
  if (!trimmed) return { ok: false, error: "人物名を入力してください" };

  // 1) 法的チェック
  const legal = await checkHistoricalPersonaLegal(trimmed);
  if (!legal) return { ok: false, error: "法的チェックに失敗しました（OPENAI_API_KEY を確認）" };
  if (legal.status === "blocked") {
    return { ok: false, legal, error: "法的チェックの結果、このペルソナの作成は見送りが推奨されます。" };
  }

  // 2) ネット検索で人物像を調査
  const research = await researchHistoricalFigure(trimmed);

  // 3) ペルソナ合成（史実ベース・本人になりきる）
  const persona = await synthesizePersona({
    name: trimmed,
    bio: research || undefined,
    mindset:
      "これは歴史上の人物の特別AIペルソナです。史実・調査結果に基づき本人の思想・立場・口調を踏まえて教育コミュニティで発言します。断定しすぎず、不確かな点は諸説ありと添える。現代の話題には本人の価値観から想像で応答してよいが、史実を捏造しない。",
  });
  if (!persona) return { ok: false, legal, error: "ペルソナ生成に失敗しました" };

  // 4) オリジナルのイラストアバター生成（実在の写真・肖像画は複製しない）
  let avatarUrl: string | null = null;
  const png = await generateAvatarImage(
    `${persona.imagePrompt} An ORIGINAL stylized illustration only; do NOT copy any real photograph or existing portrait painting of the person.`,
  );
  if (png) {
    try {
      const admin = createServiceRoleClient();
      const path = `ai-special-avatars/${Date.now()}.png`;
      const { error: upErr } = await admin.storage.from("media").upload(path, png, {
        cacheControl: "3600", upsert: true, contentType: "image/png",
      });
      if (!upErr) avatarUrl = admin.storage.from("media").getPublicUrl(path).data.publicUrl;
    } catch (e) {
      console.error("[historical-persona] upload", e);
    }
  }

  // 5) 保存
  try {
    const saved = await prisma.aiSpecialPersona.create({
      data: {
        name: trimmed,
        persona_prompt: persona.personaPrompt,
        values_text: persona.valuesText,
        expertise: persona.expertise,
        avatar_url: avatarUrl,
        source: "historical",
        legal_status: legal.status,
        legal_note: legal.note,
        created_by: profile.id,
      },
      select: { id: true, name: true, expertise: true, values_text: true, avatar_url: true },
    });
    revalidatePath("/admin/persona");
    return {
      ok: true,
      legal,
      persona: { id: saved.id, name: saved.name, expertise: saved.expertise, valuesText: saved.values_text, avatarUrl: saved.avatar_url },
    };
  } catch (e) {
    console.error("[historical-persona] save", e);
    return { ok: false, legal, error: "保存に失敗しました" };
  }
}

/** 管理者：特別ペルソナの有効/無効・削除。 */
export async function setSpecialPersonaActive(id: string, active: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.aiSpecialPersona.update({ where: { id }, data: { is_active: active } });
  revalidatePath("/admin/persona");
  return { ok: true };
}

export async function deleteSpecialPersona(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.aiSpecialPersona.delete({ where: { id } });
  revalidatePath("/admin/persona");
  return { ok: true };
}

/** 投稿IDから、現在の管理者の自分ペルソナで返信ドラフトを生成（投稿はしない）。 */
export async function generatePersonaReplyDraftForPost(
  postId: string,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const persona = await prisma.userAiPersona.findUnique({ where: { profile_id: profile.id } });
  if (!persona || !persona.persona_prompt) {
    return { ok: false, error: "先にあなたのAIペルソナを作成してください" };
  }

  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: {
      body: true,
      room: { select: { name: true, category: { select: { name: true } } } },
    },
  });
  if (!post) return { ok: false, error: "投稿が見つかりません" };

  const text = await generatePersonaReplyText({
    personaPrompt: persona.persona_prompt,
    valuesText: persona.values_text,
    expertise: persona.expertise,
    displayName: persona.display_name,
    postBody: post.body,
    subCategoryName: post.room?.name ?? "井戸端",
    categoryName: post.room?.category?.name ?? "井戸端",
  });
  if (!text) return { ok: false, error: "生成に失敗しました（OPENAI_API_KEY を確認）" };
  return { ok: true, text };
}

/** 生成・編集した返信を、管理者の自分ペルソナとして対象投稿へ投稿する。 */
export async function postPersonaReplyToPost(
  postId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const text = (body || "").trim();
  if (!text) return { ok: false, error: "返信本文が空です" };

  const persona = await prisma.userAiPersona.findUnique({ where: { profile_id: profile.id } });
  if (!persona) return { ok: false, error: "AIペルソナがありません" };

  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "投稿が見つかりません" };

  // 返信者名は「AI○○」とする（人間の発言と区別するため）。
  const aiName = persona.display_name.startsWith("AI") ? persona.display_name : `AI${persona.display_name}`;
  await prisma.forumReply.create({
    data: {
      post_id: post.id,
      author_id: persona.profile_id,
      author_name: aiName,
      author_role: "AIペルソナ",
      body: text,
    },
  });
  await prisma.userAiPersona.update({ where: { id: persona.id }, data: { last_replied_at: new Date() } });
  revalidatePath("/admin/persona");
  return { ok: true };
}
