import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  moderateCommunityText,
  type CommunityModerationKind,
} from "@/lib/community-moderation";
import { sendSlackCommunityAlert } from "@/lib/slack-community-alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().min(1).max(12000),
  kind: z.enum(["comment", "room", "topic"]).default("comment"),
});

const KIND_LABEL: Record<CommunityModerationKind, string> = {
  comment: "コメント",
  room: "ルーム",
  topic: "話題・テーマ",
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバー設定が不足しています。" },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  const { text, kind } = parsed.data;
  const openai = new OpenAI({ apiKey });
  const outcome = await moderateCommunityText(openai, text, kind);

  const profile = await getCurrentProfile();
  const userName = profile?.name ?? user.email?.split("@")[0] ?? "（不明）";

  const webhook = process.env.SLACK_COMMUNITY_ALERT_WEBHOOK_URL?.trim();
  if (webhook && outcome.slackAlert) {
    void sendSlackCommunityAlert(webhook, {
      kindLabel: KIND_LABEL[kind],
      summaryJa: outcome.slackSummaryJa,
      textExcerpt: text,
      userId: user.id,
      userName,
      blocked: !outcome.allowed,
    });
  }

  if (!outcome.allowed) {
    if (outcome.source === "error") {
      return NextResponse.json(
        {
          allowed: false,
          error:
            "投稿内容の確認中にエラーが発生しました。しばらく経ってからお試しください。",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({
      allowed: false,
      error:
        "この内容はコミュニティガイドラインに適合しないため投稿できません。表現を見直してください。",
    });
  }

  return NextResponse.json({ allowed: true });
}
