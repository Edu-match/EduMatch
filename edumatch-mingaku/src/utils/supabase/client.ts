import { createBrowserClient } from "@supabase/ssr";
import { createBrowserSupabaseStub } from "@/utils/supabase/missing-env-stub";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Supabase] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY が未設定のため、ブラウザの認証クライアントはスタブです。Vercel の Environment Variables を確認してください。"
      );
    }
    return createBrowserSupabaseStub();
  }
  return createBrowserClient(url, key);
}
