"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getServiceById } from "./services";
import { Resend } from "resend";

/** メール本文用のHTMLエスケープ */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 改行を<br>に変換（既にエスケープ済みの文字列用） */
function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br />");
}

/** Resend のレート制限（2 req/s）を避けるための待機 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SubmitMaterialRequestInput = {
  serviceId: string;
  deliveryName?: string;
  deliveryOrganization?: string | null;
  deliveryPhone?: string | null;
  deliveryEmail?: string;
  message?: string | null;
};

export type SubmitMaterialRequestResult = {
  success: boolean;
  requestId?: string;
  error?: string;
  /** 資料請求は成功したが、ユーザー宛確認メールの送信に失敗した場合 */
  userEmailFailed?: boolean;
};

export type SubmitMaterialRequestBatchInput = {
  serviceIds: string[];
  deliveryName?: string;
  deliveryOrganization?: string | null;
  deliveryPhone?: string | null;
  deliveryEmail?: string;
  message?: string | null;
};

export type SubmitMaterialRequestBatchResult = {
  success: boolean;
  requestIds?: string[];
  successCount: number;
  error?: string;
  userEmailFailed?: boolean;
};

/** 資料請求があったときにエデュマッチ運営にも通知を送る宛先 */
const EDUMATCH_NOTIFICATION_EMAIL = "info@edu-match.com";

/**
 * 資料請求を送信し、サービス提供者にメール通知する
 */
export async function submitMaterialRequest(
  input: SubmitMaterialRequestInput
): Promise<SubmitMaterialRequestResult> {
  try {
    const user = await requireAuth();
    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return { success: false, error: "プロフィールが見つかりません" };

    const service = await getServiceById(input.serviceId);
    if (!service) return { success: false, error: "サービスが見つかりません" };

    const deliveryName = (input.deliveryName ?? profile.name).trim();
    const deliveryEmail = (input.deliveryEmail ?? profile.email).trim();
    const deliveryOrganization = input.deliveryOrganization ?? profile.organization ?? null;
    const deliveryPhone = input.deliveryPhone ?? profile.phone;

    if (!deliveryEmail) return { success: false, error: "送信先メールアドレスを入力してください" };
    if (!deliveryName) return { success: false, error: "お名前を入力してください" };
    const org = (deliveryOrganization ?? profile.organization ?? "").trim();
    if (!org) return { success: false, error: "塾名・学校名等を入力してください" };

    const req = await prisma.materialRequest.create({
      data: {
        user_id: user.id,
        service_id: input.serviceId,
        use_account_address: false,
        delivery_name: deliveryName,
        delivery_organization: org,
        delivery_phone: deliveryPhone ?? null,
        delivery_postal_code: null,
        delivery_prefecture: null,
        delivery_city: null,
        delivery_address: null,
        delivery_email: deliveryEmail,
        message: input.message ?? null,
      },
    });

    const provider = service.provider;
    const providerEmails: string[] = [
      provider?.email,
      (provider as { notification_email_2?: string | null } | undefined)?.notification_email_2,
      (provider as { notification_email_3?: string | null } | undefined)?.notification_email_3,
    ]
      .filter((e): e is string => typeof e === "string" && e.trim().length > 0);
    const providerEmailsUnique = [...new Set(providerEmails)];

    const apiKey = process.env.RESEND_API_KEY;
    let userEmailFailed = false;

    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        const fromRaw = process.env.RESEND_FROM_EMAIL?.trim();
        const from = fromRaw
          ? (fromRaw.includes("<") ? fromRaw : `エデュマッチ <${fromRaw}>`)
          : "エデュマッチ <onboarding@resend.dev>";

        const reqId = req.id.slice(-8).toUpperCase();
        const svcTitle = escapeHtml(service.title);
        const reqName = escapeHtml(deliveryName);
        const reqOrg = escapeHtml(org);
        const reqEmail = escapeHtml(deliveryEmail);
        const reqPhone = deliveryPhone ? escapeHtml(deliveryPhone) : "未入力";
        const reqMessage = input.message ? nl2br(input.message) : "";
        const providerName = provider?.name ? escapeHtml(provider.name) : "サービス提供者";

        // ユーザー向けメール本文
        const userHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #16a34a;">資料請求を受け付けました</h2>
  <p>${reqName} 様</p>
  <p>エデュマッチをご利用いただきありがとうございます。<br />以下のサービスへの資料請求を受け付けました。</p>
  <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0 0 4px;"><strong>サービス名：</strong> ${svcTitle}</p>
    <p style="margin: 0;"><strong>提供者：</strong> ${providerName}</p>
  </div>
  <p><strong>${providerName}</strong> より、ご登録のメールアドレス（${reqEmail}）宛てに資料をお送りします。<br />しばらくお待ちください。</p>
  <p style="color: #64748b; font-size: 12px; margin-top: 24px;">※ このメールはエデュマッチから自動送信されています。請求番号: ${reqId}</p>
</body>
</html>`;

        // 企業向けメール本文
        const providerHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #2563eb;">【エデュマッチ】資料請求の依頼がありました。</h2>
  <p>エデュマッチにて、貴社サービス「${svcTitle}」への資料請求がありました。</p>
  <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>請求者名：</strong> ${reqName}</p>
    <p style="margin: 0 0 8px;"><strong>塾名・学校名：</strong> ${reqOrg}</p>
    <p style="margin: 0 0 8px;"><strong>メールアドレス：</strong> ${reqEmail}</p>
    <p style="margin: 0 0 8px;"><strong>電話番号：</strong> ${reqPhone}</p>
    ${reqMessage ? `<p style="margin: 8px 0 0;"><strong>備考・ご要望：</strong><br />${reqMessage}</p>` : ""}
  </div>
  <p>ご対応をお願いいたします。</p>
  <p style="color: #64748b; font-size: 12px; margin-top: 24px;">※ このメールはエデュマッチ（<a href="https://edu-match.com">edu-match.com</a>）から自動送信されています。請求番号: ${reqId}</p>
</body>
</html>`;

        // 1. ユーザーへの受付確認メール（先に送信。企業・運営より優先）
        const userResult = await resend.emails.send({
          from,
          to: deliveryEmail,
          subject: `【エデュマッチ】資料請求を受け付けました - ${service.title}`,
          html: userHtml,
        });
        if (userResult.error) {
          userEmailFailed = true;
          console.error("[RESEND] ユーザー宛メール送信エラー:", deliveryEmail, JSON.stringify(userResult.error));
          const errMsg = String(
            (userResult.error as { message?: string })?.message ?? userResult.error
          );
          if (errMsg.includes("verify a domain") || errMsg.includes("your own email")) {
            console.error("[RESEND] ドメイン未検証の可能性があります。docs/RESEND_SETUP.md を参照して edu-match.com を検証してください。");
          }
        } else {
          console.log(`[SUCCESS] ユーザー宛確認メール送信完了: ${deliveryEmail}`);
        }
        await sleep(600); // Resend レート制限（2 req/s）回避

        // 2. 企業（サービス提供者）へのメール通知（最大3件を1リクエストで送信）
        if (providerEmailsUnique.length === 0) {
          console.warn("[RESEND] サービス提供者のメールアドレスが登録されていません。企業に通知できません。", {
            serviceId: input.serviceId,
            serviceTitle: service.title,
            providerId: provider?.id,
          });
        } else {
          const providerResult = await resend.emails.send({
            from,
            to: providerEmailsUnique,
            replyTo: deliveryEmail,
            subject: `【エデュマッチ】資料請求がありました - ${service.title}`,
            html: providerHtml,
          });
          if (providerResult.error) {
            console.error("[RESEND] 企業宛メール送信エラー:", providerEmailsUnique, JSON.stringify(providerResult.error));
            const errMsg = String(
              (providerResult.error as { message?: string })?.message ?? providerResult.error
            );
            if (errMsg.includes("verify a domain") || errMsg.includes("your own email")) {
              console.error("[RESEND] ドメイン未検証の可能性があります。docs/RESEND_SETUP.md を参照して edu-match.com を検証してください。");
            }
          }
        }
        await sleep(600);

        // 3. 運営への通知（企業と別送信）
        const adminResult = await resend.emails.send({
          from,
          to: EDUMATCH_NOTIFICATION_EMAIL,
          replyTo: deliveryEmail,
          subject: `【運営通知】資料請求 - ${service.title}（${reqId}）`,
          html: providerHtml,
        });
        if (adminResult.error) {
          console.error("[RESEND] 運営宛メール送信エラー:", JSON.stringify(adminResult.error));
        }

        if (!userEmailFailed) {
          console.log(`[SUCCESS] 資料請求メール送信完了: ${service.title}, 企業: ${providerEmailsUnique.join(", ") || "なし"}, ユーザー: ${deliveryEmail}`);
        }
      } catch (mailErr) {
        const err = mailErr as { message?: string; response?: unknown };
        console.error("[ERROR] Failed to send material request emails:", err?.message ?? mailErr);
        if (err?.response) console.error("[ERROR] Resend response:", JSON.stringify(err.response));
        console.error("Details:", {
          serviceTitle: service.title,
          providerEmails: providerEmailsUnique,
          deliveryEmail,
          apiKeyPresent: !!apiKey,
          fromEmail: process.env.RESEND_FROM_EMAIL ?? "エデュマッチ <onboarding@resend.dev>",
        });
        userEmailFailed = true;
        // 資料請求の保存は完了しているので success のまま返す
      }
    } else {
      console.warn("[WARN] Skipping email sending - RESEND_API_KEY not set");
    }

    return {
      success: true,
      requestId: req.id,
      ...(userEmailFailed && { userEmailFailed: true }),
    };
  } catch (e) {
    console.error("submitMaterialRequest error:", e);
    return { success: false, error: "送信に失敗しました" };
  }
}

/**
 * 複数サービスにまとめて資料請求を送信する
 */
export async function submitMaterialRequestBatch(
  input: SubmitMaterialRequestBatchInput
): Promise<SubmitMaterialRequestBatchResult> {
  const requestIds: string[] = [];
  let userEmailFailed = false;
  for (const serviceId of input.serviceIds) {
    const result = await submitMaterialRequest({
      ...input,
      serviceId,
    });
    if (result.success && result.requestId) {
      requestIds.push(result.requestId);
    }
    if (result.userEmailFailed) userEmailFailed = true;
  }
  return {
    success: requestIds.length > 0,
    requestIds,
    successCount: requestIds.length,
    error:
      requestIds.length < input.serviceIds.length
        ? `${requestIds.length}件送信しました。${input.serviceIds.length - requestIds.length}件は送信に失敗しました。`
        : undefined,
    ...(userEmailFailed && { userEmailFailed: true }),
  };
}

export type MaterialRequestWithService = {
  id: string;
  service_id: string;
  delivery_email: string;
  created_at: Date;
  service: { title: string };
};

/**
 * 資料請求1件を取得（本人または管理者のみ）
 */
export async function getMaterialRequestById(
  requestId: string
): Promise<MaterialRequestWithService | null> {
  try {
    const user = await requireAuth();
    const req = await prisma.materialRequest.findUnique({
      where: { id: requestId },
      include: { service: { select: { title: true } } },
    });
    if (!req) return null;
    if (req.user_id !== user.id) return null;
    return {
      id: req.id,
      service_id: req.service_id,
      delivery_email: req.delivery_email,
      created_at: req.created_at,
      service: req.service,
    };
  } catch {
    return null;
  }
}
