"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { generatePersonaReplyText } from "@/lib/persona-reply";

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

  const post = await prisma.interopPost.findUnique({
    where: { id: postId },
    select: {
      body: true,
      subCategory: { select: { name: true, category: { select: { name: true } } } },
    },
  });
  if (!post) return { ok: false, error: "投稿が見つかりません" };

  const text = await generatePersonaReplyText({
    personaPrompt: persona.persona_prompt,
    valuesText: persona.values_text,
    expertise: persona.expertise,
    displayName: persona.display_name,
    postBody: post.body,
    subCategoryName: post.subCategory.name,
    categoryName: post.subCategory.category.name,
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

  const post = await prisma.interopPost.findUnique({
    where: { id: postId },
    select: { id: true, sub_category_id: true, topic_id: true },
  });
  if (!post) return { ok: false, error: "投稿が見つかりません" };

  await prisma.interopPost.create({
    data: {
      sub_category_id: post.sub_category_id,
      topic_id: post.topic_id,
      parent_post_id: post.id,
      persona_id: persona.id,
      author_id: persona.profile_id,
      is_ai_reply: true,
      author_name: persona.display_name,
      author_role: "AIペルソナ",
      body: text,
    },
  });
  await prisma.userAiPersona.update({ where: { id: persona.id }, data: { last_replied_at: new Date() } });
  revalidatePath("/admin/persona");
  return { ok: true };
}
