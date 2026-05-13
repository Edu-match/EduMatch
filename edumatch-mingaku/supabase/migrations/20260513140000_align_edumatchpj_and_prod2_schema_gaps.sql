-- 2026-05-13: スキーマの正を EduMatchPJ-Prod2（Prod2）に置いた冪等 DDL
-- Prod2 を基準に、main / prisma と比べて列だけ遅れている DB へ同じ順で流す。
--
-- 前提: 井戸端・人材の本体は 20260512130000_forum_and_talent_registration.sql（Prod2 準拠）。
-- 本ファイルはその外側で、Prisma マイグレーションが Prod2 に未適用だった列の穴埋め。
--
-- 触れないもの: Prod2 のみにある public.talent_requests / public."ForumRoomConnection"
-- （Prisma に無いためリポジトリでは定義しない）。

-- =============================================================================
-- 1) Prod2 で欠けていた main/Prisma 列（他環境でも未適用ならここで揃う）
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

-- =============================================================================
-- 2) Prod2 より遅れている環境用（20260512130000 より前の状態からの追いつき）
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
