import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { generatePersonaReplyText } from "@/lib/persona-reply";
import { isInteropAiReplyDisabled } from "@/lib/interop-ai-reply-policy";
import { getInteropSettings } from "@/lib/interop-settings.server";
import { searchKnowledgeChunks } from "@/app/_actions/chat-context";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 投稿本文から公的文書RAGの抜粋を取得（best-effort・最大2件）。 */
async function fetchKnowledgeContext(postBody: string): Promise<string> {
  try {
    const hits = await searchKnowledgeChunks(postBody, 2);
    if (!hits.length) return "";
    return hits.map((h) => `〈${h.title}〉${h.content.slice(0, 280)}`).join("\n");
  } catch {
    return "";
  }
}

/**
 * パーソナルAIペルソナによる自動返信エンジン（※現状は管理者のみ）。
 *
 * 方針:
 * - 「とりあえず管理者だけ」要件のため、ADMIN ロールが所有する有効ペルソナのみ発話させる
 * - 各ペルソナは reply_daily_limit / 日 を上限に、まだ自分が返信していないトップレベル投稿へ返信
 * - allowed_topic_ids が空なら全トピック対象。AI返信無効サブカテゴリ（登壇者への質問等）は除外
 * - 自分自身（同一 author_id / persona_id）の投稿には返信しない
 *
 *  GET  …対象ペルソナと残返信枠のドライラン確認
 *  POST …実際に返信を生成・投稿（body: { limitPerPersona?: number }）
 */

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function loadAdminPersonas() {
  return prisma.userAiPersona.findMany({
    where: {
      is_active: true,
      is_suspended: false,
      profile: { role: "ADMIN" },
    },
    select: {
      id: true,
      profile_id: true,
      display_name: true,
      persona_prompt: true,
      values_text: true,
      expertise: true,
      allowed_topic_ids: true,
      reply_daily_limit: true,
    },
  });
}

export async function GET() {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const personas = await loadAdminPersonas();
  const since = startOfTodayUtc();
  const report = await Promise.all(
    personas.map(async (p) => {
      const usedToday = await prisma.interopPost.count({
        where: { persona_id: p.id, is_ai_reply: true, created_at: { gte: since } },
      });
      return {
        id: p.id,
        displayName: p.display_name,
        dailyLimit: p.reply_daily_limit,
        usedToday,
        remaining: Math.max(0, p.reply_daily_limit - usedToday),
        allowedTopicIds: p.allowed_topic_ids,
      };
    })
  );
  return NextResponse.json({ personas: report });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 全体マスタースイッチ。OFF の間は個々のペルソナが有効でも自動返信しない。
  const settings = await getInteropSettings();
  if (!settings.personaAutoReplyEnabled) {
    return NextResponse.json({ created: 0, note: "自動返信が全体OFFです（管理画面のマスタースイッチで有効化してください）" });
  }

  let limitPerPersona = 3;
  try {
    const body = await req.json();
    if (typeof body?.limitPerPersona === "number") {
      limitPerPersona = Math.max(1, Math.min(10, body.limitPerPersona));
    }
  } catch {
    /* body 省略可 */
  }

  const personas = await loadAdminPersonas();
  if (personas.length === 0) {
    return NextResponse.json({ created: 0, note: "有効な管理者ペルソナがありません" });
  }

  const since = startOfTodayUtc();
  const results: { persona: string; created: number }[] = [];
  let totalCreated = 0;
  // 投稿ごとのRAG抜粋をキャッシュ（同じ投稿に複数ペルソナが返信しても1回だけ検索）。
  const knowledgeCache = new Map<string, string>();

  for (const persona of personas) {
    const usedToday = await prisma.interopPost.count({
      where: { persona_id: persona.id, is_ai_reply: true, created_at: { gte: since } },
    });
    const budget = Math.min(limitPerPersona, Math.max(0, persona.reply_daily_limit - usedToday));
    if (budget <= 0) {
      results.push({ persona: persona.display_name, created: 0 });
      continue;
    }

    // 返信候補：トップレベル・非固定・非表示・自分以外、まだ自分が返信していない投稿
    const candidates = await prisma.interopPost.findMany({
      where: {
        is_hidden: false,
        is_pinned: false,
        parent_post_id: null,
        is_ai_reply: false,
        author_id: { not: persona.profile_id },
        ...(persona.allowed_topic_ids.length > 0
          ? { topic_id: { in: persona.allowed_topic_ids } }
          : {}),
        replies: { none: { persona_id: persona.id } },
      },
      orderBy: { created_at: "desc" },
      take: 30,
      select: {
        id: true,
        body: true,
        topic_id: true,
        sub_category_id: true,
        subCategory: {
          select: { id: true, name: true, slug: true, category: { select: { name: true } } },
        },
      },
    });

    let created = 0;
    for (const post of candidates) {
      if (created >= budget) break;
      if (isInteropAiReplyDisabled(post.subCategory)) continue;

      // スレッドの流れ（この投稿への直近の返信・古い順で最大4件）
      const replies = await prisma.interopPost.findMany({
        where: { parent_post_id: post.id, is_hidden: false },
        orderBy: { created_at: "asc" },
        take: 4,
        select: { author_name: true, body: true },
      });

      // 投稿に関連する公的文書RAG抜粋（キャッシュ利用）
      let knowledgeContext = knowledgeCache.get(post.id);
      if (knowledgeContext === undefined) {
        knowledgeContext = await fetchKnowledgeContext(post.body);
        knowledgeCache.set(post.id, knowledgeContext);
      }

      const replyText = await generatePersonaReplyText({
        personaPrompt: persona.persona_prompt,
        valuesText: persona.values_text,
        expertise: persona.expertise,
        displayName: persona.display_name,
        postBody: post.body,
        subCategoryName: post.subCategory.name,
        categoryName: post.subCategory.category.name,
        recentPosts: replies.map((r) => ({ authorName: r.author_name, body: r.body })),
        knowledgeContext,
      });
      if (!replyText) continue;

      await prisma.interopPost.create({
        data: {
          sub_category_id: post.sub_category_id,
          topic_id: post.topic_id,
          parent_post_id: post.id,
          persona_id: persona.id,
          author_id: persona.profile_id,
          is_ai_reply: true,
          author_name: persona.display_name.startsWith("AI") ? persona.display_name : `AI${persona.display_name}`,
          author_role: "AIペルソナ",
          body: replyText,
        },
      });
      created++;
      totalCreated++;
    }

    if (created > 0) {
      await prisma.userAiPersona.update({
        where: { id: persona.id },
        data: { last_replied_at: new Date() },
      });
    }
    results.push({ persona: persona.display_name, created });
  }

  return NextResponse.json({ created: totalCreated, perPersona: results });
}
