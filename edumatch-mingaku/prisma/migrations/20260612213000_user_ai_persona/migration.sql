-- 井戸端会議 Epic B: パーソナルAIペルソナ（オプトイン・Profile 1:1）＋AI返信の発話者紐付け（非破壊）
CREATE TABLE IF NOT EXISTS "user_ai_personas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "persona_prompt" TEXT NOT NULL DEFAULT '',
  "expertise" TEXT[] NOT NULL DEFAULT '{}',
  "values_text" TEXT NOT NULL DEFAULT '',
  "allowed_topic_ids" TEXT[] NOT NULL DEFAULT '{}',
  "reply_daily_limit" INTEGER NOT NULL DEFAULT 5,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "is_suspended" BOOLEAN NOT NULL DEFAULT false,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "stage" INTEGER NOT NULL DEFAULT 0,
  "last_replied_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_ai_personas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_ai_personas_profile_id_key" ON "user_ai_personas"("profile_id");
CREATE INDEX IF NOT EXISTS "user_ai_personas_is_active_is_suspended_idx" ON "user_ai_personas"("is_active", "is_suspended");

DO $$ BEGIN
  ALTER TABLE "user_ai_personas"
    ADD CONSTRAINT "user_ai_personas_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "interop_posts" ADD COLUMN IF NOT EXISTS "persona_id" UUID;

DO $$ BEGIN
  ALTER TABLE "interop_posts"
    ADD CONSTRAINT "interop_posts_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "user_ai_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
