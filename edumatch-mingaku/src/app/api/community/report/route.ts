import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { submitUserReport } from "@/lib/user-report-service";
import { rateLimitResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reportedUserId: z.string().uuid(),
  reasonCode: z.enum([
    "HARASSMENT",
    "SPAM",
    "INAPPROPRIATE",
    "PRIVACY",
    "OTHER",
  ]),
  detail: z.string().max(4000).optional().nullable(),
  contextKind: z.enum(["comment", "profile", "article", "other"]),
  contextExcerpt: z.string().max(8000).optional().nullable(),
});

const REPORT_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 10 };

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const rl = rateLimitResponse(`report:${user.id}`, REPORT_RATE_LIMIT);
  if (rl.limited) return rl.response;

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

  const result = await submitUserReport({
    reporterId: user.id,
    reportedUserId: parsed.data.reportedUserId,
    reasonCode: parsed.data.reasonCode,
    detail: parsed.data.detail ?? null,
    contextKind: parsed.data.contextKind,
    contextExcerpt: parsed.data.contextExcerpt ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, reportId: result.reportId });
}
