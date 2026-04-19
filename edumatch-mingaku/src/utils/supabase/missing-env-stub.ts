import type { SupabaseClient } from "@supabase/supabase-js"

const noopSubscription = { unsubscribe: () => {} }

const missingConfigError = {
  message:
    "Supabase が未設定です（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）",
  name: "AuthError",
  status: 400,
} as const

function authErr() {
  return {
    data: null,
    error: missingConfigError,
  }
}

/**
 * Preview 等で公開用 env が未設定でも画面が真っ白にならないよう、
 * createBrowserClient を呼ばずに最小限の auth API だけ持つスタブを返す。
 */
export function createBrowserSupabaseStub(): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: noopSubscription },
      }),
      signOut: async () => ({ error: null }),
      setSession: async () => ({
        data: { session: null, user: null },
        error: missingConfigError,
      }),
      updateUser: async () => ({
        data: { user: null },
        error: missingConfigError,
      }),
    },
  } as unknown as SupabaseClient
}

/**
 * サーバー側: env 未設定時は未ログイン扱い。認証 API は明示的にエラーを返す。
 */
export async function createServerSupabaseStub(): Promise<SupabaseClient> {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => authErr(),
      signUp: async () => authErr(),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => authErr(),
      verifyOtp: async () => ({ error: missingConfigError }),
      signInWithOAuth: async () => authErr(),
      updateUser: async () => authErr(),
    },
  } as unknown as SupabaseClient
}
