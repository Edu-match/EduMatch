/**
 * 承認キュー用: Supabase から記事・サービスを status 別に取得
 * Supabase ダッシュボードで見ているデータと同期する
 */

import { createServiceRoleClient } from "@/utils/supabase/server-admin";

export type PostFromSupabase = {
  id: string;
  title: string;
  content: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  status: string;
  provider_id: string;
  provider: { id: string; name: string | null; avatar_url: string | null };
};

export type ServiceFromSupabase = {
  id: string;
  title: string;
  description: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  status: string;
  provider_id: string;
  provider: { id: string; name: string | null; avatar_url: string | null };
};

type PostWithProvider = Omit<PostFromSupabase, "provider"> & {
  provider: { id: string; name: string | null; avatar_url: string | null };
};
type ServiceWithProvider = Omit<ServiceFromSupabase, "provider"> & {
  provider: { id: string; name: string | null; avatar_url: string | null };
};

// PENDING 用は最小限のカラム（approved_at 等がないDBにも対応）
const postSelectPending = `
  id, title, content, submitted_at, provider_id,
  Profile!provider_id ( id, name, avatar_url )
`;
const serviceSelectPending = `
  id, title, description, submitted_at, provider_id,
  Profile!provider_id ( id, name, avatar_url )
`;
// APPROVED/REJECTED 用は追加カラム含む
const postSelectFull = `
  id, title, content, submitted_at, approved_at, rejected_at, rejection_reason, status, provider_id,
  Profile!provider_id ( id, name, avatar_url )
`;
const serviceSelectFull = `
  id, title, description, submitted_at, approved_at, rejected_at, rejection_reason, status, provider_id,
  Profile!provider_id ( id, name, avatar_url )
`;

function mapPost(row: Record<string, unknown>): PostWithProvider {
  const profile = row.Profile as Record<string, unknown> | null;
  const { Profile: _p, ...rest } = row;
  return {
    ...rest,
    provider: profile
      ? { id: profile.id, name: profile.name ?? null, avatar_url: profile.avatar_url ?? null }
      : { id: (rest.provider_id as string) ?? "", name: "投稿者", avatar_url: null },
  } as PostWithProvider;
}

function mapService(row: Record<string, unknown>): ServiceWithProvider {
  const profile = row.Profile as Record<string, unknown> | null;
  const { Profile: _p, ...rest } = row;
  return {
    ...rest,
    provider: profile
      ? { id: profile.id, name: profile.name ?? null, avatar_url: profile.avatar_url ?? null }
      : { id: (rest.provider_id as string) ?? "", name: "提供者", avatar_url: null },
  } as ServiceWithProvider;
}

/**
 * 記事一覧を Supabase から status 指定で取得
 */
async function getPostsByStatus(status: "PENDING" | "APPROVED" | "REJECTED"): Promise<PostWithProvider[]> {
  try {
    const supabase = createServiceRoleClient();
    const select = status === "PENDING" ? postSelectPending : postSelectFull;
    const orderBy = status === "PENDING" ? "submitted_at" : status === "APPROVED" ? "approved_at" : "rejected_at";
    const { data, error } = await supabase
      .from("Post")
      .select(select)
      .eq("status", status)
      .order(orderBy, { ascending: false })
      .limit(100);
    if (error) {
      console.error("[supabase-pending-approvals] getPostsByStatus:", error);
      return [];
    }
    return (data ?? []).map((row) => mapPost(row as Record<string, unknown>));
  } catch (e) {
    console.error("[supabase-pending-approvals] getPostsByStatus:", e);
    return [];
  }
}

/**
 * サービス一覧を Supabase から status 指定で取得
 */
async function getServicesByStatus(status: "PENDING" | "APPROVED" | "REJECTED"): Promise<ServiceWithProvider[]> {
  try {
    const supabase = createServiceRoleClient();
    const select = status === "PENDING" ? serviceSelectPending : serviceSelectFull;
    const orderBy = status === "PENDING" ? "submitted_at" : status === "APPROVED" ? "approved_at" : "rejected_at";
    const { data, error } = await supabase
      .from("Service")
      .select(select)
      .eq("status", status)
      .order(orderBy, { ascending: false })
      .limit(100);
    if (error) {
      console.error("[supabase-pending-approvals] getServicesByStatus:", error);
      return [];
    }
    return (data ?? []).map((row) => mapService(row as Record<string, unknown>));
  } catch (e) {
    console.error("[supabase-pending-approvals] getServicesByStatus:", e);
    return [];
  }
}

export async function getPendingPostsFromSupabase() {
  return getPostsByStatus("PENDING");
}

export async function getPendingServicesFromSupabase() {
  return getServicesByStatus("PENDING");
}

export async function getApprovedPostsFromSupabase() {
  return getPostsByStatus("APPROVED");
}

export async function getApprovedServicesFromSupabase() {
  return getServicesByStatus("APPROVED");
}

export async function getRejectedPostsFromSupabase() {
  return getPostsByStatus("REJECTED");
}

export async function getRejectedServicesFromSupabase() {
  return getServicesByStatus("REJECTED");
}
