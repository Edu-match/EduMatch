"use server";

import { Resend } from "resend";

const EDUMATCH_INQUIRY_EMAIL = "info@edu-match.com";

export type SubmitContactInput = {
  name: string;
  email: string;
  category: string;
  message: string;
};

export type SubmitContactResult = {
  success: boolean;
  inquiryId?: string;
  error?: string;
};

/**
 * お問い合わせを送信し、ユーザーと運営にメール通知する
 */
export async function submitContact(
  input: SubmitContactInput
): Promise<SubmitContactResult> {
  const name = input.name.trim();
  const email = input.email.trim();
  const category = input.category.trim();
  const message = input.message.trim();

  if (!name) return { success: false, error: "お名前を入力してください" };
  if (!email) return { success: false, error: "メールアドレスを入力してください" };
  if (!category) return { success: false, error: "お問い合わせ種別を選択してください" };
  if (!message) return { success: false, error: "お問い合わせ内容を入力してください" };

  const inquiryId = `INQ-${Date.now().toString(36).toUpperCase()}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[CONTACT] RESEND_API_KEY is not set");
    return { success: false, error: "メール送信の設定が完了していません。しばらくしてから再度お試しください。" };
  }

  try {
    const resend = new Resend(apiKey);
    const fromRaw = process.env.RESEND_FROM_EMAIL?.trim();
    const from = fromRaw
      ? (fromRaw.includes("<") ? fromRaw : `エデュマッチ <${fromRaw}>`)
      : "エデュマッチ <onboarding@resend.dev>";

    // 1. 運営への通知メール（reply_to で返信しやすくする）
    const adminResult = await resend.emails.send({
      from,
      to: EDUMATCH_INQUIRY_EMAIL,
      replyTo: email,
      subject: `【エデュマッチ】お問い合わせ - ${category}（${inquiryId}）`,
      html: `
        <h2>お問い合わせがありました</h2>
        <p>以下の内容でお問い合わせが届いています。</p>
        <hr />
        <p><strong>問い合わせ番号：</strong> ${inquiryId}</p>
        <p><strong>種別：</strong> ${category}</p>
        <p><strong>お名前：</strong> ${name}</p>
        <p><strong>メールアドレス：</strong> ${email}</p>
        <p><strong>お問い合わせ内容：</strong></p>
        <div style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 4px;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        <hr />
        <p style="color:#666;font-size:12px;">このメールに返信すると、お問い合わせ者に届きます。</p>
      `,
    });

    if (adminResult.error) {
      console.error("[CONTACT] Admin email error:", JSON.stringify(adminResult.error));
      return { success: false, error: "メールの送信に失敗しました。しばらくしてから再度お試しください。" };
    }

    // 2. ユーザーへの受付確認メール
    const userResult = await resend.emails.send({
      from,
      to: email,
      subject: `【エデュマッチ】お問い合わせを受け付けました（${inquiryId}）`,
      html: `
        <h2>お問い合わせを受け付けました</h2>
        <p>${name} 様</p>
        <p>エデュマッチへお問い合わせいただきありがとうございます。<br />以下の内容で受け付けました。</p>
        <hr />
        <p><strong>問い合わせ番号：</strong> ${inquiryId}</p>
        <p><strong>種別：</strong> ${category}</p>
        <p><strong>お問い合わせ内容：</strong></p>
        <div style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 4px;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        <hr />
        <p>担当者より、ご登録のメールアドレスに回答をお送りいたします。<br />通常2〜3営業日以内にご連絡いたします。</p>
        <p style="color:#666;font-size:12px;margin-top:20px;">このメールはエデュマッチから自動送信されています。</p>
      `,
    });

    if (userResult.error) {
      console.error("[CONTACT] User confirmation email error:", JSON.stringify(userResult.error));
      // 運営には届いているので success を返すが、ユーザーには届いていない
      console.warn("[CONTACT] User confirmation failed but admin was notified");
    }

    return { success: true, inquiryId };
  } catch (e) {
    console.error("[CONTACT] Submit error:", e);
    return { success: false, error: "送信に失敗しました。しばらくしてから再度お試しください。" };
  }
}
