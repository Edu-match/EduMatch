import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: talentId } = await params;
    const body = await req.json();
    const { requesterName, requesterEmail, requesterPhone, requesterOrg, requestType, message } = body as {
      requesterName: string;
      requesterEmail: string;
      requesterPhone?: string | null;
      requesterOrg?: string | null;
      requestType: string;
      message: string;
    };

    if (!requesterName?.trim() || !requesterEmail?.trim() || !requestType?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const user = await getCurrentUser();

    await prisma.$executeRaw`
      INSERT INTO talent_requests
        (talent_id, requester_id, requester_name, requester_email, requester_phone, requester_org, request_type, message)
      VALUES
        (${talentId}::uuid, ${user?.id ?? null}::uuid, ${requesterName.trim()}, ${requesterEmail.trim()},
         ${requesterPhone ?? null}, ${requesterOrg ?? null}, ${requestType.trim()}, ${message.trim()})
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[talent/[id]/request POST]", err);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
