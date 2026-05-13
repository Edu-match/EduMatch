-- 2026-05-13: Supabase MCP list_tables(verbose) による EduMatchPJ と EduMatchPJ-Prod2 の差分整理用
-- 参照プロジェクト: EduMatchPJ (lyoesgwecpcoaylsyiys), EduMatchPJ-Prod2 (rlgaflpkkonsamsmxprt)
--
-- 目的: git main / prisma/schema.prisma に揃えるための **冪等な補足 DDL**。
-- 既存の prisma/migrations および 20260512130000_forum_and_talent_registration.sql を
-- 各環境で未適用の場合は、先にそちらを適用してください（本ファイルは置き換えではありません）。
--
-- 差分サマリ（調査時点）:
-- - Prod2: "Service" の request_notification_emails / show_material_request_button /
--   display_order / provider_display_avatar_url 欠落、"CorporateProfile".job_title 欠落、
--   "SiteUpdate".show_in_slider 欠落、forum_rooms.is_hidden 欠落（RLS が参照するため重要）。
-- - EduMatchPJ: "Profile".ai_kentei_passed 欠落、General/Corporate の人材マッチング用列欠落、
--   forum_rooms の ai_weekly_topic_enabled / is_hidden 欠落、forum_room_topics テーブル欠落、
--   forum_posts.topic_id 欠落。
-- - Prod2 のみに存在する public.talent_requests / public."ForumRoomConnection" はリポジトリに
--   定義がないため本ファイルでは触れません（必要なら別途モデル化を検討）。
--
-- 注意: マイグレーションの実行は行わない方針のため、本ファイル追加のみ。適用は手動または CI で判断。

-- =============================================================================
-- 1) EduMatchPJ 側: main / 20260512130000 で追加される列・テーブルが未適用の場合の追いつき
-- =============================================================================

ALTER TABLE public."Profile"
  ADD COLUMN IF NOT EXISTS ai_kentei_passed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public."GeneralProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS talent_matching_description TEXT,
  ADD COLUMN IF NOT EXISTS talent_badges TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS talent_hourly_rate TEXT;

ALTER TABLE public."CorporateProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS talent_matching_description TEXT,
  ADD COLUMN IF NOT EXISTS talent_badges TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS talent_hourly_rate TEXT;

ALTER TABLE public.forum_rooms
  ADD COLUMN IF NOT EXISTS ai_weekly_topic_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.forum_room_topics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  room_id TEXT NOT NULL REFERENCES public.forum_rooms (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forum_room_topics_room_period_idx
  ON public.forum_room_topics (room_id, period_start DESC);

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS topic_id TEXT REFERENCES public.forum_room_topics (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS forum_posts_topic_id_idx
  ON public.forum_posts (topic_id);

-- =============================================================================
-- 2) Prod2 側: Prisma マイグレーション相当が未適用の場合の追いつき
-- =============================================================================

ALTER TABLE public."CorporateProfile"
  ADD COLUMN IF NOT EXISTS "job_title" TEXT;

ALTER TABLE public."SiteUpdate"
  ADD COLUMN IF NOT EXISTS show_in_slider BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "SiteUpdate_show_in_slider_idx"
  ON public."SiteUpdate" (show_in_slider);

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "request_notification_emails" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE public."Service"
SET "request_notification_emails" = ARRAY[]::TEXT[]
WHERE "request_notification_emails" IS NULL;

ALTER TABLE public."Service"
  ALTER COLUMN "request_notification_emails" SET NOT NULL;

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "show_material_request_button" BOOLEAN DEFAULT TRUE;

UPDATE public."Service"
SET "show_material_request_button" = TRUE
WHERE "show_material_request_button" IS NULL;

ALTER TABLE public."Service"
  ALTER COLUMN "show_material_request_button" SET NOT NULL;

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 999;

UPDATE public."Service"
SET "display_order" = 999
WHERE "display_order" IS NULL;

ALTER TABLE public."Service"
  ALTER COLUMN "display_order" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "service_display_order_idx"
  ON public."Service" ("display_order", "created_at" DESC);

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "provider_display_avatar_url" TEXT;
