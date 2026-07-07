import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { getSiteOrigin } from "@/lib/site-url";
import { Resend } from "resend";
import { verifyOrigin } from "@/lib/security";

const requestBodySchema = z.object({
  email: z.string().max(320).optional(),
});

export const dynamic = "force-dynamic";

/**
 * パスワードリセット用メール送信。
 * Supabase Admin の generateLink でリセットリンクを取得し、Resend で送信する。
 * セキュリティのため、メールの有無に関わらず常に同じレスポンスを返す（ユーザー列挙の防止）。
 */
export async function POST(request: NextRequest) {
  const csrf = verifyOrigin(request);
  if (csrf) return csrf;

  try {
    const parsed = requestBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "入力内容が正しくありません" },
        { status: 400 }
      );
    }
    const email = parsed.data.email?.trim() ?? "";

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    const origin = getSiteOrigin(request.nextUrl.origin);

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error) {
      // ユーザーが存在しない等でもログのみ。クライアントには成功と同じレスポンスを返す
      console.error("Password reset generateLink error:", error.message);
      return NextResponse.json({ ok: true });
    }

    // PKCE 非互換を避けるため action_link は使わず、hashed_token で独自リンクを構築
    const props = (data as { properties?: { hashed_token?: string } })?.properties;
    const hashedToken = props?.hashed_token;

    if (hashedToken) {
      const confirmUrl = new URL("/auth/confirm-password-reset", origin);
      confirmUrl.searchParams.set("token_hash", hashedToken);
      const resetLink = confirmUrl.toString();
      const apiKey = process.env.RESEND_API_KEY;
      const fromRaw = process.env.RESEND_FROM_EMAIL?.trim();
      const from = fromRaw
        ? fromRaw.includes("<")
          ? fromRaw
          : `エデュマッチ <${fromRaw}>`
        : "エデュマッチ <onboarding@resend.dev>";

      if (apiKey) {
        const resend = new Resend(apiKey);
        const sentAt = new Date().toLocaleString("ja-JP", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const sendResult = await resend.emails.send({
          from,
          to: email,
          subject: `【エデュマッチ】パスワードの再設定（${sentAt}）`,
          html: `
            <h2>パスワードの再設定</h2>
            <p>パスワードを再設定するには、以下のリンクをクリックしてください。</p>
            <p><a href="${resetLink}" style="color: #2563eb; text-decoration: underline;">パスワードを再設定する</a></p>
            <p>リンクの有効期限は24時間です。心当たりがない場合はこのメールを無視してください。</p>
            <hr />
            <p style="color:#666;font-size:12px;">このメールに心当たりがない場合は、お問い合わせください。</p>
          `,
        });
        if (sendResult.error) {
          console.error("Password reset Resend error:", sendResult.error);
        }
      } else {
        console.error("RESEND_API_KEY is not set; password reset email not sent");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ ok: true });
  }
}
