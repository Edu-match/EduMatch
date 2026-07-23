import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_BODY = 10;
const MAX_BODY = 500;
const MAX_NAME = 40;

/** 教育AIサミット＠議員会館 特設ページ「ご意見・要望」の書き込み（来場者・ログイン不要） */
export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as { authorName?: string; body?: string };

    const text = json.body?.trim() ?? "";
    if (text.length < MIN_BODY) {
      return NextResponse.json(
        { error: `${MIN_BODY}文字以上で入力してください` },
        { status: 400 },
      );
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json(
        { error: `${MAX_BODY}文字以内で入力してください` },
        { status: 400 },
      );
    }

    const authorName = (json.authorName?.trim() ?? "").slice(0, MAX_NAME);

    const voice = await prisma.kaikanVoice.create({
      data: { author_name: authorName, body: text },
    });

    return NextResponse.json(
      {
        voice: {
          id: voice.id,
          authorName: voice.author_name,
          body: voice.body,
          postedAt: voice.created_at.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[kaikan/voice POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
