-- Prod2 / preview 環境で Prisma スキーマより DB が古いときの穴埋め（横断）。
-- 以下のテーブル/カラムが無いと、該当機能（活動ログ・通報・プロンプト上書き・
-- 文言上書き・お知らせスライダー）を開いた瞬間に実行時エラーになる。すべて IF NOT EXISTS。

-- ── ActivityLog（管理アクティビティログ）──
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT NOT NULL,
  "actor_id" UUID,
  "actor_name" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "target_title" TEXT NOT NULL,
  "detail" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ActivityLog_created_at_idx" ON "ActivityLog"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "ActivityLog_actor_id_idx" ON "ActivityLog"("actor_id");
CREATE INDEX IF NOT EXISTS "ActivityLog_target_type_target_id_idx" ON "ActivityLog"("target_type", "target_id");
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ActivityLogComment ──
CREATE TABLE IF NOT EXISTS "ActivityLogComment" (
  "id" TEXT NOT NULL,
  "log_id" TEXT NOT NULL,
  "author_id" UUID,
  "author_name" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLogComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ActivityLogComment_log_id_idx" ON "ActivityLogComment"("log_id");
DO $$ BEGIN
  ALTER TABLE "ActivityLogComment" ADD CONSTRAINT "ActivityLogComment_log_id_fkey"
    FOREIGN KEY ("log_id") REFERENCES "ActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLogComment" ADD CONSTRAINT "ActivityLogComment_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── UserReport（ユーザー通報）──
CREATE TABLE IF NOT EXISTS "UserReport" (
  "id" TEXT NOT NULL,
  "reporter_id" UUID NOT NULL,
  "reported_user_id" UUID NOT NULL,
  "reason_code" TEXT NOT NULL,
  "detail" TEXT,
  "context_kind" TEXT NOT NULL,
  "context_excerpt" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserReport_reported_user_id_created_at_idx" ON "UserReport"("reported_user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "UserReport_reporter_id_idx" ON "UserReport"("reporter_id");
CREATE INDEX IF NOT EXISTS "UserReport_created_at_idx" ON "UserReport"("created_at" DESC);
DO $$ BEGIN
  ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporter_id_fkey"
    FOREIGN KEY ("reporter_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reported_user_id_fkey"
    FOREIGN KEY ("reported_user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── system_prompt_overrides ──
CREATE TABLE IF NOT EXISTS system_prompt_overrides (
  id TEXT NOT NULL,
  mode TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  CONSTRAINT system_prompt_overrides_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS system_prompt_overrides_mode_key ON system_prompt_overrides(mode);

-- ── text_overrides ──
CREATE TABLE IF NOT EXISTS text_overrides (
  id TEXT NOT NULL,
  pathname TEXT NOT NULL,
  text_key TEXT NOT NULL,
  original TEXT NOT NULL,
  override TEXT NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  CONSTRAINT text_overrides_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS text_overrides_pathname_text_key_key ON text_overrides(pathname, text_key);
CREATE INDEX IF NOT EXISTS text_overrides_pathname_idx ON text_overrides(pathname);

-- ── SiteUpdate.show_in_slider（お知らせスライダー）──
ALTER TABLE "SiteUpdate" ADD COLUMN IF NOT EXISTS "show_in_slider" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "SiteUpdate_show_in_slider_idx" ON "SiteUpdate"("show_in_slider");
