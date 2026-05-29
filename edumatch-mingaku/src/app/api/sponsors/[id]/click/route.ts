import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * スポンサーPRのクリックを計測し、リンク先へリダイレクトする。
 * トップページのバナーはこの URL を経由させることで click_count を集計する。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const ad = await prisma.sponsorAd.findUnique({
      where: { id },
      select: { link_url: true },
    });

    if (!ad) {
      return NextResponse.redirect(new URL("/", _req.url));
    }

    // クリック数を加算（失敗してもリダイレクトは継続）
    void prisma.sponsorAd
      .update({ where: { id }, data: { click_count: { increment: 1 } } })
      .catch((e) => console.error("[sponsors/click] increment", e));

    return NextResponse.redirect(ad.link_url);
  } catch (err) {
    console.error("[sponsors/:id/click]", err);
    return NextResponse.redirect(new URL("/", _req.url));
  }
}
