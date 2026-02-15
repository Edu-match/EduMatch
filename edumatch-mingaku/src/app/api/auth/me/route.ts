import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 認証済みユーザーのプロフィール（role等）を返す。
 * ヘッダーのアカウントメニュー表示用（Prismaで取得するためRLSの影響を受けない）。
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }
  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
    },
  });
}
