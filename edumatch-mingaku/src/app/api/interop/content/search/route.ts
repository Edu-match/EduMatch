import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { searchInteropCandidates } from "@/lib/interop-content.server";
import { INTEROP_CONTENT_KINDS, type InteropContentKind } from "@/lib/interop-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KINDS = INTEROP_CONTENT_KINDS.map((k) => k.value);

/** 管理者用コンテンツ検索（kinds + keyword で候補を返す） */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kindsParam = req.nextUrl.searchParams.get("kinds") ?? "";
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const kinds = kindsParam
    .split(",")
    .map((k) => k.trim())
    .filter((k): k is InteropContentKind => ALLOWED_KINDS.includes(k as InteropContentKind));

  if (kinds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const items = await searchInteropCandidates(kinds, q, 30);
  return NextResponse.json({ items });
}
