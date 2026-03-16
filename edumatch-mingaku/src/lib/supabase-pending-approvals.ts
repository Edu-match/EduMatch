/**
 * 承認キュー用: Supabase から status = PENDING の記事・サービスのみを取得する
 * Supabase ダッシュボードで見ているデータと同期する
 */

import { createServiceRoleClient } from "@/utils/supabase/server-admin";

export type PendingPostFromSupabase = {
  id: string;
  title: string;
  content: string;
  submitted_at: string | null;
  provider_id: string;
  provider: { id: string; name: string | null; avatar_url: string | null };
};

export type PendingServiceFromSupabase = {
  id: string;
  title: string;
  description: string;
  submitted_at: string | null;
  provider_id: string;
  provider: { id: string; name: string | null; avatar_url: string | null };
};

/**
 * 承認待ちの記事一覧を Supabase から取得（status = PENDING のみ）
 */
export async function getPendingPostsFromSupabase(): Promise<PendingPostFromSupabase[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("Post")
      .select(
        `
        id,
        title,
        content,
        submitted_at,
        provider_id,
        Profile!provider_id ( id, name, avatar_url )
      `
      )
      .eq("status", "PENDING")
      .order("submitted_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("[supabase-pending-approvals] getPendingPosts error:", error);
      return [];
    }
    if (!data || !Array.isArray(data)) return [];

    return data.map((row: Record<string, unknown>) => {
      const profile = row.Profile as Record<string, unknown> | null;
      const { Profile: _p, ...rest } = row;
      return {
        ...rest,
        provider: profile
          ? {
              id: profile.id,
              name: profile.name ?? null,
              avatar_url: profile.avatar_url ?? null,
            }
          : { id: (rest.provider_id as string) ?? "", name: "投稿者", avatar_url: null },
      };
    }) as PendingPostFromSupabase[];
  } catch (e) {
    console.error("[supabase-pending-approvals] getPendingPosts:", e);
    return [];
  }
}

/**
 * 承認待ちのサービス一覧を Supabase から取得（status = PENDING のみ）
 */
export async function getPendingServicesFromSupabase(): Promise<PendingServiceFromSupabase[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("Service")
      .select(
        `
        id,
        title,
        description,
        submitted_at,
        provider_id,
        Profile!provider_id ( id, name, avatar_url )
      `
      )
      .eq("status", "PENDING")
      .order("submitted_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("[supabase-pending-approvals] getPendingServices error:", error);
      return [];
    }
    if (!data || !Array.isArray(data)) return [];

    return data.map((row: Record<string, unknown>) => {
      const profile = row.Profile as Record<string, unknown> | null;
      const { Profile: _p, ...rest } = row;
      return {
        ...rest,
        provider: profile
          ? {
              id: profile.id,
              name: profile.name ?? null,
              avatar_url: profile.avatar_url ?? null,
            }
          : { id: (rest.provider_id as string) ?? "", name: "提供者", avatar_url: null },
      };
    }) as PendingServiceFromSupabase[];
  } catch (e) {
    console.error("[supabase-pending-approvals] getPendingServices:", e);
    return [];
  }
}
