import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Prisma / DB の疎通と件数確認（Vercel Preview での切り分け用）
 *
 * 使い方:
 * 1. Vercel に `HEALTH_CHECK_SECRET` を設定（Preview など）
 * 2. GET `/api/health/database?secret=YOUR_SECRET`
 *
 * 秘密が一致しない場合は 404（情報を出さない）
 */
export async function GET(request: NextRequest) {
  const expected = process.env.HEALTH_CHECK_SECRET;
  const secret = request.nextUrl.searchParams.get("secret");
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [
      serviceCount,
      postCount,
      siteUpdateCount,
      sliderLinkCount,
      publicServiceCount,
      publicPostCount,
    ] = await Promise.all([
      prisma.service.count(),
      prisma.post.count(),
      prisma.siteUpdate.count(),
      prisma.homeSliderArticle.count(),
      prisma.service.count({
        where: {
          AND: [
            { OR: [{ status: "APPROVED" }, { is_published: true }] },
            { is_member_only: false },
          ],
        },
      }),
      prisma.post.count({
        where: {
          AND: [
            { OR: [{ status: "APPROVED" }, { is_published: true }] },
            { is_member_only: false },
          ],
        },
      }),
    ]);

    let supabaseHost: string | null = null;
    try {
      const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
      supabaseHost = u ? new URL(u).hostname : null;
    } catch {
      supabaseHost = null;
    }

    return NextResponse.json({
      ok: true,
      prisma: "connected",
      counts: {
        services_total: serviceCount,
        posts_total: postCount,
        site_updates: siteUpdateCount,
        home_slider_links: sliderLinkCount,
        /** 未ログイン時の一覧に出る条件で数えた件数 */
        services_visible_when_logged_out: publicServiceCount,
        posts_visible_when_logged_out: publicPostCount,
      },
      env: {
        vercel_env: process.env.VERCEL_ENV ?? null,
        has_database_url: Boolean(process.env.DATABASE_URL),
        has_direct_url: Boolean(process.env.DIRECT_URL),
        next_public_supabase_host: supabaseHost,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, prisma: "error", error: message },
      { status: 500 }
    );
  }
}
