"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { generatePersonaReplyText } from "@/lib/persona-reply";
import { synthesizePersona, generateAvatarImage } from "@/lib/persona-ai";
import { checkPersonaLegal, researchFigure, type LegalVerdict } from "@/lib/historical-persona";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { checkPromptInjection } from "@/lib/security";

/** SEC-013: ペルソナプロンプトの最大長（ハード上限） */
const MAX_PERSONA_PROMPT_LENGTH = 5000;

/**
 * SEC-013: ペルソナプロンプトの共通バリデーション。
 * - 空・最大長を検証
 * - プロンプトインジェクションパターンは検出してもブロックせずログのみ
 */
function validatePersonaPrompt(
  personaPrompt: string,
  context: string,
): { ok: true; trimmed: string } | { ok: false; error: string } {
  const trimmed = (personaPrompt || "").trim();
  if (!trimmed) return { ok: false, error: "システムプロンプトは空にできません" };
  if (trimmed.length > MAX_PERSONA_PROMPT_LENGTH) {
    return { ok: false, error: `システムプロンプトは${MAX_PERSONA_PROMPT_LENGTH}文字以内にしてください` };
  }

  const injection = checkPromptInjection(trimmed);
  if (injection.detected) {
    // 管理者操作のためブロックはしないが、監査用にログを残す（SEC-013）
    console.warn(
      `[security] persona prompt injection pattern detected (${context}): pattern=${injection.pattern}`
    );
  }

  return { ok: true, trimmed };
}

export type SpecialPersonaResult = {
  ok: boolean;
  error?: string;
  legal?: LegalVerdict;
  persona?: {
    id: string;
    name: string;
    expertise: string[];
    valuesText: string;
    avatarUrl: string | null;
    personaPrompt: string;
  };
};

/** @deprecated Use createSpecialPersona */
export type HistoricalPersonaResult = SpecialPersonaResult;

function ensureAiPrefix(name: string): string {
  if (name.startsWith("AI")) return name;
  return `AI${name}`;
}

/**
 * 人物名 or 自由記述から、AI法的チェック→ネット検索→ペルソナ＋オリジナルイラスト生成→保存。
 * blocked 判定の場合は生成せず理由を返す（管理者が許可確認済みの場合は続行可能）。
 *
 * inputType: "person" = 人物名入力, "freeform" = 自由記述
 */
export async function createSpecialPersona(
  input: string,
  inputType: "person" | "freeform" = "person",
  permissionConfirmed = false,
): Promise<SpecialPersonaResult> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const trimmed = (input || "").trim();
  if (!trimmed) return { ok: false, error: "入力を入力してください" };

  // 1) 法的チェック
  const legal = await checkPersonaLegal(trimmed);
  if (!legal) return { ok: false, error: "法的チェックに失敗しました（OPENAI_API_KEY を確認）" };

  if (legal.status === "blocked" && !permissionConfirmed) {
    const msg = legal.living
      ? "存命の人物のため作成できません。本人・権利者の許可を取得済みの場合のみ、確認手順から作成してください。"
      : legal.realPerson
        ? "法的チェックの結果、このペルソナの作成は見送りが推奨されます。許可取得済みの場合のみ確認手順から作成できます。"
        : "著作権で保護されたキャラクターのため作成できません。権利者の許可を取得済みの場合のみ、確認手順から作成してください。";
    return { ok: false, legal, error: msg };
  }

  // 2) 実在人物ならネット検索で調査
  const research = legal.realPerson ? await researchFigure(trimmed) : "";

  // 3) ペルソナ合成
  const mindsetForPerson =
    "これは特別AIペルソナです。" +
    (legal.realPerson
      ? "史実・調査結果に基づき本人の思想・立場・口調を踏まえて教育コミュニティで発言します。断定しすぎず、不確かな点は諸説ありと添える。現代の話題には本人の価値観から想像で応答してよいが、史実を捏造しない。"
      : "入力された設定に基づき、その人格・キャラクターの思想・立場・口調を踏まえて教育コミュニティで発言します。設定に忠実でありつつ、教育的な議論に建設的に参加します。");

  const personaInput = legal.realPerson
    ? { name: trimmed, bio: research || undefined, mindset: mindsetForPerson }
    : { name: trimmed, bio: trimmed, mindset: mindsetForPerson };

  const persona = await synthesizePersona(personaInput);
  if (!persona) return { ok: false, legal, error: "ペルソナ生成に失敗しました" };

  // 名称を「AI○○」形式に強制
  const displayName = ensureAiPrefix(persona.displayName);

  // 4) オリジナルのイラストアバター生成
  let avatarUrl: string | null = null;
  const imageNote = legal.realPerson
    ? " An ORIGINAL stylized illustration only; do NOT copy any real photograph or existing portrait painting of the person."
    : "";
  const png = await generateAvatarImage(`${persona.imagePrompt}${imageNote}`);
  if (png) {
    try {
      const admin = createServiceRoleClient();
      const path = `ai-special-avatars/${Date.now()}.png`;
      const { error: upErr } = await admin.storage.from("media").upload(path, png, {
        cacheControl: "3600", upsert: true, contentType: "image/png",
      });
      if (!upErr) avatarUrl = admin.storage.from("media").getPublicUrl(path).data.publicUrl;
    } catch (e) {
      console.error("[special-persona] upload", e);
    }
  }

  // 5) 保存
  try {
    const source = legal.realPerson ? "person" : "freeform";
    const saved = await prisma.aiSpecialPersona.create({
      data: {
        name: displayName,
        persona_prompt: persona.personaPrompt,
        values_text: persona.valuesText,
        expertise: persona.expertise,
        avatar_url: avatarUrl,
        source,
        legal_status: legal.status,
        legal_note: permissionConfirmed && legal.status === "blocked"
          ? `${legal.note}\n【管理者確認】本人・権利者の許可取得済みとして作成。`
          : legal.note,
        created_by: profile.id,
      },
      select: { id: true, name: true, expertise: true, values_text: true, avatar_url: true, persona_prompt: true },
    });
    revalidatePath("/admin/persona");
    return {
      ok: true,
      legal,
      persona: {
        id: saved.id,
        name: saved.name,
        expertise: saved.expertise,
        valuesText: saved.values_text,
        avatarUrl: saved.avatar_url,
        personaPrompt: saved.persona_prompt,
      },
    };
  } catch (e) {
    console.error("[special-persona] save", e);
    return { ok: false, legal, error: "保存に失敗しました" };
  }
}

/** @deprecated Use createSpecialPersona */
export async function createHistoricalPersona(
  name: string,
  permissionConfirmed = false,
): Promise<SpecialPersonaResult> {
  return createSpecialPersona(name, "person", permissionConfirmed);
}

/** 管理者：特別ペルソナの有効/無効。 */
export async function setSpecialPersonaActive(id: string, active: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.aiSpecialPersona.update({ where: { id }, data: { is_active: active } });
  revalidatePath("/admin/persona");
  return { ok: true };
}

/** 管理者：特別ペルソナの削除。 */
export async function deleteSpecialPersona(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.aiSpecialPersona.delete({ where: { id } });
  revalidatePath("/admin/persona");
  return { ok: true };
}

/** 管理者：特別ペルソナのシステムプロンプトを更新。 */
export async function updateSpecialPersonaPrompt(
  id: string,
  personaPrompt: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const validated = validatePersonaPrompt(personaPrompt, `updateSpecialPersonaPrompt:${id}`);
  if (!validated.ok) return { ok: false, error: validated.error };
  const trimmed = validated.trimmed;
  if (trimmed.length > 2000) return { ok: false, error: "システムプロンプトは2000文字以内にしてください" };
  await prisma.aiSpecialPersona.update({ where: { id }, data: { persona_prompt: trimmed } });
  revalidatePath("/admin/persona");
  return { ok: true };
}

/** 管理者：自分ペルソナのシステムプロンプトを更新。 */
export async function updateMyPersonaPrompt(
  personaPrompt: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const validated = validatePersonaPrompt(personaPrompt, `updateMyPersonaPrompt:${profile.id}`);
  if (!validated.ok) return { ok: false, error: validated.error };
  const trimmed = validated.trimmed;
  if (trimmed.length > 2000) return { ok: false, error: "システムプロンプトは2000文字以内にしてください" };

  await prisma.userAiPersona.update({
    where: { profile_id: profile.id },
    data: { persona_prompt: trimmed },
  });
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

  const aiName = ensureAiPrefix(persona.display_name);
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
