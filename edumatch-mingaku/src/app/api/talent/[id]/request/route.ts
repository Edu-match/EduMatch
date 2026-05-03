import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const ADMIN_NOTIFY = "info@edu-match.com";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: talentId } = await params;
    if (!UUID_RE.test(talentId)) {
      return NextResponse.json({ error: "無効なプロフィールです" }, { status: 400 });
    }

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

    const talentProfile = await prisma.profile.findUnique({
      where: { id: talentId },
      select: { name: true, email: true },
    });
    if (!talentProfile?.email) {
      return NextResponse.json({ error: "対象の人材が見つかりません" }, { status: 404 });
    }

    await prisma.talentRequest.create({
      data: {
        talent_id: talentId,
        requester_id: user?.id && UUID_RE.test(user.id) ? user.id : null,
        requester_name: requesterName.trim(),
        requester_email: requesterEmail.trim(),
        requester_phone: requesterPhone?.trim() || null,
        requester_org: requesterOrg?.trim() || null,
        request_type: requestType.trim(),
        message: message.trim(),
      },
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        const fromRaw = process.env.RESEND_FROM_EMAIL?.trim();
        const from =
          fromRaw && fromRaw.length > 0
            ? fromRaw.includes("<")
              ? fromRaw
              : `エデュマッチ <${fromRaw}>`
            : "エデュマッチ <onboarding@resend.dev>";

        const subject = `【エデュマッチ】${talentProfile.name}様宛：人材マッチングの依頼が届きました`;
        const textBody = [
          `${talentProfile.name} 様`,
          "",
          "人材マッチング経由で依頼が送信されました。",
          "",
          `依頼種別: ${requestType}`,
          `依頼者: ${requesterName.trim()}`,
          `メール: ${requesterEmail.trim()}`,
          requesterPhone ? `電話: ${requesterPhone}` : "",
          requesterOrg ? `所属: ${requesterOrg}` : "",
          "",
          "--- メッセージ ---",
          message.trim(),
          "",
          "本メールに返信するか、エデュマッチ上の連絡手段でご対応ください。",
        ]
          .filter(Boolean)
          .join("\n");

        await resend.emails.send({
          from,
          to: talentProfile.email,
          subject,
          text: textBody,
        });

        await resend.emails.send({
          from,
          to: requesterEmail.trim(),
          subject: "【エデュマッチ】依頼を送信しました",
          text: [
            `${requesterName.trim()} 様`,
            "",
            `${talentProfile.name} さんへの依頼を受け付けました。`,
            "",
            "内容:",
            message.trim(),
            "",
            "相手方からの連絡をお待ちください。",
          ].join("\n"),
        });

        await resend.emails.send({
          from,
          to: ADMIN_NOTIFY,
          subject: `【エデュマッチ運営】人材依頼: ${talentProfile.name} ← ${requesterName.trim()}`,
          text: textBody,
        });
      } catch (mailErr) {
        console.error("[talent/[id]/request POST] Resend error (依頼は保存済み):", mailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[talent/[id]/request POST]", err);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
