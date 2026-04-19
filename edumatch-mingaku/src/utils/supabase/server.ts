import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseStub } from "@/utils/supabase/missing-env-stub";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) {
    return createServerSupabaseStub();
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Components may not allow setting cookies.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Server Components may not allow setting cookies.
        }
      },
    },
  });
}

/**
 * OAuth コールバック等の Route Handler 用。
 * `cookies().set` は Route Handler では握りつぶされがちなので、getAll/setAll で
 * セッション Cookie をバッファし、最後に NextResponse へ載せる。
 */
export function createRouteHandlerSupabaseForOAuth(request: NextRequest) {
  const pending: { name: string; value: string; options?: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            pending.push({ name, value, options });
          }
        },
      },
    }
  );

  function applySessionCookies(response: NextResponse) {
    for (const { name, value, options } of pending) {
      response.cookies.set(name, value, options ?? {});
    }
  }

  return { supabase, applySessionCookies };
}
