import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/app/_actions/activity-log";

export const dynamic = "force-dynamic";

/**
 * 公開: 指定ページの文言上書きを取得する。
 * テーブル未作成などで失敗しても、サイト表示が壊れないよう空配列を返す。
 */
export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.searchParams.get("pathname");
  if (!pathname) {
    return NextResponse.json({ overrides: [] });
  }
  try {
    const rows = await prisma.textOverride.findMany({
      where: { pathname },
      select: { text_key: true, original: true, override: true },
    });
    return NextResponse.json({
      overrides: rows.map((r) => ({
        key: r.text_key,
        original: r.original,
        override: r.override,
      })),
    });
  } catch (e) {
    console.error("GET /api/text-overrides error:", e);
    return NextResponse.json({ overrides: [] });
  }
}

/**
 * 管理者のみ: 文言の上書きを保存(upsert)する。
 * 既存レコードがある場合は original を保ったまま override のみ更新する。
 */
export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    pathname?: string;
    textKey?: string;
    original?: string;
    override?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pathname = (body.pathname ?? "").trim();
  const textKey = (body.textKey ?? "").trim();
  const original = body.original ?? "";
  const override = body.override ?? "";

  if (!pathname || !textKey) {
    return NextResponse.json(
      { error: "pathname と textKey は必須です" },
      { status: 400 }
    );
  }

  try {
    await prisma.textOverride.upsert({
      where: { pathname_text_key: { pathname, text_key: textKey } },
      create: {
        pathname,
        text_key: textKey,
        original,
        override,
        updated_by: profile.id,
      },
      update: {
        override,
        updated_by: profile.id,
      },
    });
    void logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: "UPDATE",
      targetType: "TEXT_OVERRIDE",
      targetId: `${pathname}:${textKey}`,
      targetTitle: pathname,
      detail: original ? `文言を変更: ${original.slice(0, 80)}` : "文言を変更",
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/text-overrides error:", e);
    return NextResponse.json(
      { error: "保存に失敗しました。テキスト上書き用のテーブルが未作成の可能性があります。" },
      { status: 500 }
    );
  }
}

/**
 * 管理者のみ: 上書きを削除して元の文言に戻す。
 */
export async function DELETE(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pathname = (req.nextUrl.searchParams.get("pathname") ?? "").trim();
  const textKey = (req.nextUrl.searchParams.get("textKey") ?? "").trim();
  if (!pathname || !textKey) {
    return NextResponse.json(
      { error: "pathname と textKey は必須です" },
      { status: 400 }
    );
  }

  try {
    await prisma.textOverride.deleteMany({
      where: { pathname, text_key: textKey },
    });
    void logActivity({
      actorId: profile.id,
      actorName: profile.name,
      action: "DELETE",
      targetType: "TEXT_OVERRIDE",
      targetId: `${pathname}:${textKey}`,
      targetTitle: pathname,
      detail: "文言上書きを削除",
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/text-overrides error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
