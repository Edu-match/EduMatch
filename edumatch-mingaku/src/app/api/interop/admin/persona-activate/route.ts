import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 管理者が自分のパーソナルAIペルソナの自動返信を有効化/無効化する（オプトイン）。
 *  GET   …自分のペルソナの現在状態
 *  POST  …{ isActive?: boolean, replyDailyLimit?: number, allowedTopicIds?: string[] } を更新
 *
 * ※自動返信は現状「管理者のみ」。ペルソナ自体は generatePersonaAndAvatar で全ユーザーが作れるが、
 *   発話を有効化できるのは ADMIN に限定する。
 */

export async function GET() {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const persona = await prisma.userAiPersona.findUnique({
    where: { profile_id: profile.id },
    select: {
      id: true,
      display_name: true,
      avatar_url: true,
      is_active: true,
      is_suspended: true,
      reply_daily_limit: true,
      allowed_topic_ids: true,
      persona_prompt: true,
      values_text: true,
      expertise: true,
    },
  });
  return NextResponse.json({ persona });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile().catch(() => null);
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.userAiPersona.findUnique({ where: { profile_id: profile.id } });
  if (!existing) {
    return NextResponse.json(
      { error: "先にプロフィール登録でAIアバター（ペルソナ）を生成してください" },
      { status: 400 }
    );
  }

  let payload: { isActive?: boolean; replyDailyLimit?: number; allowedTopicIds?: string[] } = {};
  try {
    payload = await req.json();
  } catch {
    /* 空更新は状態反転として扱う */
  }

  const data: {
    is_active?: boolean;
    reply_daily_limit?: number;
    allowed_topic_ids?: string[];
  } = {};
  if (typeof payload.isActive === "boolean") data.is_active = payload.isActive;
  else data.is_active = !existing.is_active; // 指定なしならトグル
  if (typeof payload.replyDailyLimit === "number") {
    data.reply_daily_limit = Math.max(1, Math.min(20, payload.replyDailyLimit));
  }
  if (Array.isArray(payload.allowedTopicIds)) {
    data.allowed_topic_ids = payload.allowedTopicIds.filter((s) => typeof s === "string");
  }

  const updated = await prisma.userAiPersona.update({
    where: { profile_id: profile.id },
    data,
    select: { id: true, is_active: true, reply_daily_limit: true, allowed_topic_ids: true },
  });

  return NextResponse.json({ persona: updated });
}
