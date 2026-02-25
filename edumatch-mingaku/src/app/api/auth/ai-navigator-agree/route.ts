import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * AIナビゲーター利用上の注意に同意したことを Profile テーブルに保存する。
 * 同意しないとチャットを利用できないようにするため。
 */
export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    await prisma.profile.update({
      where: { id: user.id },
      data: { ai_navigator_agreed_at: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ai-navigator-agree error:", e);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
