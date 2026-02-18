/**
 * サービス一覧・掲載企業一覧用: Supabase から直接サービス（＋投稿者）を取得する
 * リクエストの重複を避け、1回のクエリで取得する
 */

import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import { getCurrentUser } from "@/lib/auth";
import { unstable_cache } from "next/cache";

export type ServiceWithProviderFromSupabase = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  category: string;
  price_info: string;
  is_member_only: boolean;
  status: string;
  is_published: boolean;
  provider_id: string;
  created_at: string;
  provider: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
};

const CACHE_TTL_SECONDS = 60;

async function fetchPublicServicesUncached(
  isLoggedIn: boolean
): Promise<ServiceWithProviderFromSupabase[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("Service")
    .select(
      `
      id,
      title,
      description,
      thumbnail_url,
      category,
      price_info,
      is_member_only,
      status,
      is_published,
      provider_id,
      created_at,
      Profile!provider_id ( id, name, email, avatar_url )
    `
    )
    .or("status.eq.APPROVED,is_published.eq.true")
    .order("created_at", { ascending: false });

  if (!isLoggedIn) {
    query = query.eq("is_member_only", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[supabase-services] Error fetching services:", error);
    return [];
  }

  if (!data || !Array.isArray(data)) return [];

  return data.map((row: Record<string, unknown>) => {
    const profile = row.Profile as Record<string, unknown> | null;
    const { Profile: _, ...rest } = row;
    return {
      ...rest,
      provider: profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            avatar_url: profile.avatar_url ?? null,
          }
        : {
            id: (rest.provider_id as string) ?? "",
            name: "提供者",
            email: "",
            avatar_url: null,
          },
    };
  }) as ServiceWithProviderFromSupabase[];
}

/**
 * unstable_cache はモジュールレベルで1回だけ定義する必要がある。
 * 関数内で毎回生成するとキャッシュが効かない。
 */
const fetchServicesForAnon = unstable_cache(
  () => fetchPublicServicesUncached(false),
  ["public-services-anon"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-services"] }
);

const fetchServicesForAuth = unstable_cache(
  () => fetchPublicServicesUncached(true),
  ["public-services-auth"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-services"] }
);

/**
 * 公開サービス一覧を Supabase から取得（キャッシュ付き）
 * サービス一覧・掲載企業一覧の両方で利用する
 */
export async function getPublicServicesFromSupabase(): Promise<
  ServiceWithProviderFromSupabase[]
> {
  const user = await getCurrentUser();
  return user ? fetchServicesForAuth() : fetchServicesForAnon();
}
