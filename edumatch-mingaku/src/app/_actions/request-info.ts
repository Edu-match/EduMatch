"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getServiceById } from "./services";
import { Resend } from "resend";

export type SubmitMaterialRequestInput = {
  serviceId: string;
  useAccountAddress: boolean;
  deliveryName?: string;
  deliveryPhone?: string | null;
  deliveryPostalCode?: string | null;
  deliveryPrefecture?: string | null;
  deliveryCity?: string | null;
  deliveryAddress?: string | null;
  deliveryEmail?: string;
  message?: string | null;
};

export type SubmitMaterialRequestResult = {
  success: boolean;
  requestId?: string;
  error?: string;
};

export type SubmitMaterialRequestBatchInput = {
  serviceIds: string[];
  useAccountAddress: boolean;
  deliveryName?: string;
  deliveryPhone?: string | null;
  deliveryPostalCode?: string | null;
  deliveryPrefecture?: string | null;
  deliveryCity?: string | null;
  deliveryAddress?: string | null;
  deliveryEmail?: string;
  message?: string | null;
};

export type SubmitMaterialRequestBatchResult = {
  success: boolean;
  requestIds?: string[];
  successCount: number;
  error?: string;
};

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

    const useAccount = input.useAccountAddress;
    const deliveryName = useAccount ? profile.name : (input.deliveryName ?? profile.name);
    const deliveryEmail = (input.deliveryEmail ?? profile.email).trim();
    const deliveryPhone = useAccount ? profile.phone : input.deliveryPhone;
    const deliveryPostalCode = useAccount ? profile.postal_code : input.deliveryPostalCode;
    const deliveryPrefecture = useAccount ? profile.prefecture : input.deliveryPrefecture;
    const deliveryCity = useAccount ? profile.city : input.deliveryCity;
    const deliveryAddress = useAccount ? profile.address : input.deliveryAddress;

    if (!deliveryEmail) return { success: false, error: "送信先メールアドレスを入力してください" };

    // 別住所で請求の場合は住所必須
    if (!useAccount) {
      if (!deliveryName?.trim()) return { success: false, error: "お名前を入力してください" };
      if (!deliveryPostalCode?.trim()) return { success: false, error: "郵便番号を入力してください" };
      if (!deliveryPrefecture?.trim()) return { success: false, error: "都道府県を選択してください" };
      if (!deliveryCity?.trim()) return { success: false, error: "市区町村を入力してください" };
      if (!deliveryAddress?.trim()) return { success: false, error: "町名・番地・建物名を入力してください" };
    }

    const req = await prisma.materialRequest.create({
      data: {
        user_id: user.id,
        service_id: input.serviceId,
        use_account_address: useAccount,
        delivery_name: deliveryName,
        delivery_phone: deliveryPhone ?? null,
        delivery_postal_code: deliveryPostalCode ?? null,
        delivery_prefecture: deliveryPrefecture ?? null,
        delivery_city: deliveryCity ?? null,
        delivery_address: deliveryAddress ?? null,
        delivery_email: deliveryEmail,
        message: input.message ?? null,
      },
    });

    const providerEmail = service.provider?.email;
    const apiKey = process.env.RESEND_API_KEY;
    
    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
        const addr = [
          deliveryPrefecture,
          deliveryCity,
          deliveryAddress,
        ]
          .filter(Boolean)
          .join("");

        // 1. サービス提供者へのメール通知
        if (providerEmail) {
          await resend.emails.send({
            from,
            to: providerEmail,
            subject: `【エデュマッチ】資料請求がありました - ${service.title}`,
            html: `
              <h2>エデュマッチで資料請求の依頼がありました</h2>
              <p>以下の内容で資料請求が届いています。</p>
              <hr />
              <p><strong>対象サービス：</strong> ${service.title}</p>
              <p><strong>請求者名：</strong> ${deliveryName}</p>
              <p><strong>メールアドレス：</strong> ${deliveryEmail}</p>
              <p><strong>電話番号：</strong> ${deliveryPhone ?? "未入力"}</p>
              <p><strong>送付先住所：</strong><br />〒${deliveryPostalCode ?? ""}<br />${addr || "未入力"}</p>
              ${input.message ? `<p><strong>備考：</strong><br />${input.message.replace(/\n/g, "<br />")}</p>` : ""}
              <hr />
              <p style="color:#666;font-size:12px;">このメールはエデュマッチから自動送信されています。</p>
            `,
          });
        }

        // 2. ユーザーへの確認メール
        await resend.emails.send({
          from,
          to: deliveryEmail,
          subject: `【エデュマッチ】資料請求を受け付けました - ${service.title}`,
          html: `
            <h2>資料請求を受け付けました</h2>
            <p>${deliveryName} 様</p>
            <p>エデュマッチをご利用いただきありがとうございます。<br />以下の内容で資料請求を受け付けました。</p>
            <hr />
            <p><strong>サービス名：</strong> ${service.title}</p>
            <p><strong>提供者：</strong> ${service.provider?.name ?? "未設定"}</p>
            <p><strong>お名前：</strong> ${deliveryName}</p>
            <p><strong>メールアドレス：</strong> ${deliveryEmail}</p>
            <p><strong>電話番号：</strong> ${deliveryPhone ?? "未入力"}</p>
            <p><strong>送付先住所：</strong><br />〒${deliveryPostalCode ?? ""}<br />${addr || "未入力"}</p>
            ${input.message ? `<p><strong>ご要望：</strong><br />${input.message.replace(/\n/g, "<br />")}</p>` : ""}
            <hr />
            <p>サービス提供者から、ご登録のメールアドレスまたは住所宛てに資料が届きます。<br />しばらくお待ちください。</p>
            <p style="color:#666;font-size:12px;margin-top:20px;">このメールはエデュマッチから自動送信されています。</p>
          `,
        });

        console.log(`[SUCCESS] Material request emails sent for service: ${service.title}, to provider: ${providerEmail}, to user: ${deliveryEmail}`);
      } catch (mailErr) {
        console.error("[ERROR] Failed to send material request emails:", mailErr);
        console.error("Details:", {
          serviceTitle: service.title,
          providerEmail,
          deliveryEmail,
          apiKeyPresent: !!apiKey,
          fromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
        });
        // 資料請求の保存は完了しているので success のまま返す
      }
    } else {
      console.warn("[WARN] Skipping email sending - RESEND_API_KEY not set");
    }

    return { success: true, requestId: req.id };
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
  for (const serviceId of input.serviceIds) {
    const result = await submitMaterialRequest({
      ...input,
      serviceId,
    });
    if (result.success && result.requestId) {
      requestIds.push(result.requestId);
    }
  }
  return {
    success: requestIds.length > 0,
    requestIds,
    successCount: requestIds.length,
    error:
      requestIds.length < input.serviceIds.length
        ? `${requestIds.length}件送信しました。${input.serviceIds.length - requestIds.length}件は送信に失敗しました。`
        : undefined,
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
