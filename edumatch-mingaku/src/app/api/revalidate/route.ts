import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Supabaseでis_published等を直接変更した際に、サイトのキャッシュを無効化するAPI
 *
 * 使い方:
 * 1. 手動: curl "https://your-site.com/api/revalidate?secret=YOUR_SECRET"
 * 2. Supabase Database Webhook: Service/PostテーブルのINSERT/UPDATE/DELETE時にこのURLを呼ぶ
 *    - Webhook URL: https://your-site.com/api/revalidate
 *    - HTTP Headers: Authorization: Bearer YOUR_SECRET
 *
 * 環境変数: REVALIDATE_SECRET を設定すること
 */
async function handleRevalidate(request: NextRequest) {
  const secret =
    request.headers.get("Authorization")?.replace("Bearer ", "") ??
    request.nextUrl.searchParams.get("secret");

  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { type, table } = body as { type?: string; table?: string };

    // Supabase Webhook のペイロードの場合: Service/Post の変更時のみ再検証
    const isWebhook = type && ["INSERT", "UPDATE", "DELETE"].includes(type);
    const isRelevantTable = table && ["Service", "Post"].includes(table);

    if (isWebhook && isRelevantTable) {
      // 該当テーブルが変更された場合のみ再検証
      await revalidatePaths();
    } else if (!isWebhook) {
      // 手動呼び出しの場合は常に再検証
      await revalidatePaths();
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    console.error("[revalidate] Error:", err);
    return NextResponse.json(
      { error: "Revalidation failed" },
      { status: 500 }
    );
  }
}

async function revalidatePaths() {
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/companies");
  revalidatePath("/articles");
  revalidateTag("public-services");
}

export async function GET(request: NextRequest) {
  return handleRevalidate(request);
}

export async function POST(request: NextRequest) {
  return handleRevalidate(request);
}
