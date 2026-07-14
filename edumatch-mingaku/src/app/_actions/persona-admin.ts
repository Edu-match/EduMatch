"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { generatePersonaReplyText } from "@/lib/persona-reply";
import { synthesizePersona, generateAvatarImage } from "@/lib/persona-ai";
import { checkPersonaLegal, researchHistoricalFigure, type LegalVerdict } from "@/lib/historical-persona";
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

export type HistoricalPersonaResult = {
  ok: boolean;
  error?: string;
  legal?: LegalVerdict;
  persona?: { id: string; name: string; expertise: string[]; valuesText: string; avatarUrl: string | null; personaPrompt?: string };
};

/**
 * AIペルソナを作成（法的チェック→ネット検索 or 説明ベース→ペルソナ＋オリジナルイラスト生成→保存）。
 * description がない場合は従来通りネット検索で人物像を調査。
 * description がある場合はネット検索をスキップし、説明文ベースでペルソナを生成。
 * blocked 判定の場合は生成せず理由を返す。
 */
export async function createSpecialPersona(
  name: string,
  permissionConfirmed = false,
  description?: string,
): Promise<HistoricalPersonaResult> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const trimmed = (name || "").trim();
  if (!trimmed) return { ok: false, error: "名前を入力してください" };

  // AI○○ フォーマットの徹底
  const displayName = trimmed.startsWith("AI") ? trimmed : `AI${trimmed}`;
  const descTrimmed = (description || "").trim();

  // 1) 法的チェック（説明がある場合も行う）
  const legal = await checkPersonaLegal(trimmed);
  if (!legal) return { ok: false, error: "法的チェックに失敗しました（OPENAI_API_KEY を確認）" };
  // blocked（存命者含む）は原則作成不可。ただし管理者が本人・権利者の許可取得済みを明示確認した場合のみ続行。
  if (legal.status === "blocked" && !permissionConfirmed) {
    return {
      ok: false,
      legal,
      error: legal.living
        ? "存命の人物のため作成できません。本人・権利者の許可を取得済みの場合のみ、下の確認手順から作成してください。"
        : "法的チェックの結果、このペルソナの作成は見送りが推奨されます。許可取得済みの場合のみ確認手順から作成できます。",
    };
  }

  // 2) ネット検索 or 説明文ベース
  let research = "";
  let mindset: string;
  if (descTrimmed) {
    // 説明がある場合はネット検索をスキップし、説明文ベースで人格を構築
    mindset = `これはカスタムAIペルソナです。以下の説明に基づき人格を構築してください: ${descTrimmed}`;
  } else {
    // 説明がない場合（従来の人物名入力）: ネット検索で人物像を調査
    research = await researchHistoricalFigure(trimmed);
    mindset =
      "これは歴史上の人物の特別AIペルソナです。史実・調査結果に基づき本人の思想・立場・口調を踏まえて教育コミュニティで発言します。断定しすぎず、不確かな点は諸説ありと添える。現代の話題には本人の価値観から想像で応答してよいが、史実を捏造しない。";
  }

  // 3) ペルソナ合成（values_text は管理者用特別ペルソナでは不要なので空にする）
  const persona = await synthesizePersona({
    name: displayName,
    bio: research || undefined,
    mindset,
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
      console.error("[special-persona] upload", e);
    }
  }

  // 5) 保存（values_text は管理者用特別ペルソナでは空にする）
  const source = descTrimmed ? "custom" : "historical";
  try {
    const saved = await prisma.aiSpecialPersona.create({
      data: {
        name: displayName,
        persona_prompt: persona.personaPrompt,
        values_text: "",
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

/** 管理者：特別ペルソナのシステムプロンプトを再生成。 */
export async function regenerateSpecialPersonaPrompt(
  id: string,
): Promise<{ ok: boolean; newPrompt?: string; error?: string }> {
  await requireAdmin();
  const sp = await prisma.aiSpecialPersona.findUnique({ where: { id } });
  if (!sp) return { ok: false, error: "ペルソナが見つかりません" };

  const isRealPerson = sp.source === "person";
  const mindset =
    "これは特別AIペルソナです。" +
    (isRealPerson
      ? "史実・調査結果に基づき本人の思想・立場・口調を踏まえて教育コミュニティで発言します。断定しすぎず、不確かな点は諸説ありと添える。"
      : "入力された設定に基づき、その人格・キャラクターの思想・立場・口調を踏まえて教育コミュニティで発言します。");

  const result = await synthesizePersona({
    name: sp.name,
    bio: sp.values_text ?? undefined,
    mindset,
    activities: sp.expertise?.join("、") ?? undefined,
  });
  if (!result) return { ok: false, error: "生成に失敗しました" };

  await prisma.aiSpecialPersona.update({
    where: { id },
    data: { persona_prompt: result.personaPrompt },
  });
  revalidatePath("/admin/persona");
  return { ok: true, newPrompt: result.personaPrompt };
}

/** 管理者：自分ペルソナのシステムプロンプトを再生成（登録情報から synthesizePersona を再実行）。 */
export async function regenerateMyPersonaPrompt(): Promise<{ ok: boolean; newPrompt?: string; error?: string }> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const persona = await prisma.userAiPersona.findUnique({ where: { profile_id: profile.id } });
  if (!persona) return { ok: false, error: "先にAIペルソナを作成してください" };

  const result = await synthesizePersona({
    name: persona.display_name,
    bio: profile.bio ?? undefined,
    mindset: persona.values_text ?? undefined,
    activities: persona.expertise?.join("、") ?? undefined,
    interests: persona.expertise ?? undefined,
    role: profile.role ?? undefined,
  });
  if (!result) return { ok: false, error: "生成に失敗しました（OPENAI_API_KEY を確認）" };

  await prisma.userAiPersona.update({
    where: { profile_id: profile.id },
    data: { persona_prompt: result.personaPrompt },
  });
  revalidatePath("/admin/persona");
  return { ok: true, newPrompt: result.personaPrompt };
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

/** 管理者：自分ペルソナの自動返信の有効/無効を切り替える。 */
export async function setMyPersonaActive(
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };
  try {
    await prisma.userAiPersona.update({
      where: { profile_id: profile.id },
      data: { is_active: active },
    });
  } catch {
    return { ok: false, error: "更新に失敗しました" };
  }
  revalidatePath("/admin/persona");
  return { ok: true };
}

/**
 * テスト会話：サンプル投稿文に対し、自分ペルソナの声で返信を生成する（フォーラムには投稿しない）。
 * プロンプト調整後の「聞こえ方」を確認する用途。
 */
export async function generatePersonaTestReply(
  sampleBody: string,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  await requireAdmin();
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "管理者のみ利用できます" };

  const body = (sampleBody || "").trim();
  if (!body) return { ok: false, error: "テスト投稿文を入力してください" };
  if (body.length > 2000) return { ok: false, error: "テスト投稿文は2000文字以内にしてください" };

  const persona = await prisma.userAiPersona.findUnique({ where: { profile_id: profile.id } });
  if (!persona || !persona.persona_prompt) {
    return { ok: false, error: "先にあなたのAIペルソナを作成してください" };
  }

  const text = await generatePersonaReplyText({
    personaPrompt: persona.persona_prompt,
    valuesText: persona.values_text,
    expertise: persona.expertise,
    displayName: persona.display_name,
    postBody: body,
    subCategoryName: "テスト",
    categoryName: "テスト会話",
  });
  if (!text) return { ok: false, error: "生成に失敗しました（OPENAI_API_KEY を確認）" };
  return { ok: true, text };
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
