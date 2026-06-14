import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidInteropVoterKey } from "@/lib/interop-voter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 投稿へのいいね追加・取り消し（トグル・ログイン不要） */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { postId?: string; voterKey?: string };
    const postId = body.postId?.trim();
    const voterKey = body.voterKey?.trim();

    if (!postId || !voterKey || !isValidInteropVoterKey(voterKey)) {
      return NextResponse.json({ error: "postId and voterKey are required" }, { status: 400 });
    }

    const post = await prisma.interopPost.findFirst({
      where: {
        id: postId,
        is_hidden: false,
        is_ai_reply: false,
        parent_post_id: null,
      },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
    }

    const existing = await prisma.interopPostLike.findUnique({
      where: { post_id_voter_key: { post_id: postId, voter_key: voterKey } },
    });

    if (existing) {
      await prisma.interopPostLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.interopPostLike.create({
        data: { post_id: postId, voter_key: voterKey },
      });
    }

    const count = await prisma.interopPostLike.count({ where: { post_id: postId } });
    return NextResponse.json({ liked: !existing, count });
  } catch (err) {
    console.error("[interop/posts/likes POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
