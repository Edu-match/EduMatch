import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/server-admin'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * AI検定テーブルへのアクセス用クライアント。
 * Supabase で RLS が有効だと、anon キーでは行が0件になることがあるため、
 * サーバー側の API では原則サービスロールを使う。
 */
export async function getAiKenteiDb(): Promise<SupabaseClient> {
  try {
    return createServiceRoleClient()
  } catch (e) {
    console.warn(
      '[ai-kentei] SUPABASE_SERVICE_ROLE_KEY が無いためユーザークライアントを使用します。RLS により問題が取得できない場合はサービスロールを設定してください。',
      e
    )
    return await createClient()
  }
}
