import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const HELP_GUIDE_TITLE = "エデュマッチ 利用ガイド";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guideArticle = await prisma.siteUpdate.findFirst({
      where: { title: HELP_GUIDE_TITLE },
      orderBy: { published_at: "desc" },
      select: { id: true, link: true },
    });

    const href = guideArticle?.link || (guideArticle ? `/site-updates/${guideArticle.id}` : "/help");
    return NextResponse.json({ href });
  } catch {
    return NextResponse.json({ href: "/help" });
  }
}
