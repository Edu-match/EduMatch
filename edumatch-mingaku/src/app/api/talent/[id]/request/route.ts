import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const ADMIN_NOTIFY = "info@edu-match.com";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstNonEmpty(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    const t = v?.trim();
    if (t) return t;
  }
  return null;
}

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

    const [general, corporate, talentProfile] = await Promise.all([
      prisma.generalProfile.findUnique({
        where: { id: talentId },
        select: { talent_matching_enabled: true },
      }),
      prisma.corporateProfile.findUnique({
        where: { id: talentId },
        select: {
          talent_matching_enabled: true,
          notification_email_2: true,
          notification_email_3: true,
        },
      }),
      prisma.profile.findUnique({
        where: { id: talentId },
        select: { name: true, email: true },
      }),
    ]);

    const talentEnabled =
      general?.talent_matching_enabled === true || corporate?.talent_matching_enabled === true;
    if (!talentEnabled || !talentProfile) {
      return NextResponse.json({ error: "対象の人材が見つかりません" }, { status: 404 });
    }

    const notifyEmail = firstNonEmpty(
      talentProfile.email,
      corporate?.notification_email_2,
      corporate?.notification_email_3
    );
    if (!notifyEmail) {
      return NextResponse.json(
        {
          error:
            "この人材には通知用メールアドレスが登録されていません。運営にお問い合わせください。",
        },
        { status: 422 }
      );
    }

    const requesterId = user?.id && UUID_RE.test(user.id) ? user.id : null;
    const row = {
      talent_id: talentId,
      requester_id: requesterId,
      requester_name: requesterName.trim(),
      requester_email: requesterEmail.trim(),
      requester_phone: requesterPhone?.trim() || null,
      requester_org: requesterOrg?.trim() || null,
      request_type: requestType.trim(),
      message: message.trim(),
    };

    try {
      await prisma.talentRequest.create({ data: row });
    } catch (firstErr) {
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      const missingTable =
        /does not exist|relation ["']talent_requests|42P01|talent_requests/i.test(msg);
      if (!missingTable) throw firstErr;

      if (row.requester_id) {
        await prisma.$executeRaw`
          INSERT INTO talent_requests
            (talent_id, requester_id, requester_name, requester_email, requester_phone, requester_org, request_type, message)
          VALUES
            (${row.talent_id}::uuid,
             ${row.requester_id}::uuid,
             ${row.requester_name},
             ${row.requester_email},
             ${row.requester_phone},
             ${row.requester_org},
             ${row.request_type},
             ${row.message})
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO talent_requests
            (talent_id, requester_id, requester_name, requester_email, requester_phone, requester_org, request_type, message)
          VALUES
            (${row.talent_id}::uuid,
             NULL,
             ${row.requester_name},
             ${row.requester_email},
             ${row.requester_phone},
             ${row.requester_org},
             ${row.request_type},
             ${row.message})
        `;
      }
    }

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
          `依頼種別: ${row.request_type}`,
          `依頼者: ${row.requester_name}`,
          `メール: ${row.requester_email}`,
          row.requester_phone ? `電話: ${row.requester_phone}` : "",
          row.requester_org ? `所属: ${row.requester_org}` : "",
          "",
          "--- メッセージ ---",
          row.message,
          "",
          "本メールに返信するか、エデュマッチ上の連絡手段でご対応ください。",
        ]
          .filter(Boolean)
          .join("\n");

        await resend.emails.send({
          from,
          to: notifyEmail,
          subject,
          text: textBody,
        });

        await resend.emails.send({
          from,
          to: row.requester_email,
          subject: "【エデュマッチ】依頼を送信しました",
          text: [
            `${row.requester_name} 様`,
            "",
            `${talentProfile.name} さんへの依頼を受け付けました。`,
            "",
            "内容:",
            row.message,
            "",
            "相手方からの連絡をお待ちください。",
          ].join("\n"),
        });

        await resend.emails.send({
          from,
          to: ADMIN_NOTIFY,
          subject: `【エデュマッチ運営】人材依頼: ${talentProfile.name} ← ${row.requester_name}`,
          text: textBody,
        });
      } catch (mailErr) {
        console.error("[talent/[id]/request POST] Resend error (依頼は保存済み):", mailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[talent/[id]/request POST]", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003") {
        return NextResponse.json({ error: "対象の人材が見つかりません" }, { status: 404 });
      }
    }
    const msg = err instanceof Error ? err.message : "";
    if (/does not exist|42P01|talent_requests/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "依頼の保存先テーブルがデータベースにありません。運営がマイグレーション SQL を実行するまでお待ちください。",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
