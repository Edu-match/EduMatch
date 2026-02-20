-- seminar_event カスタム投稿タイプ格納テーブル
CREATE TABLE IF NOT EXISTS "SeminarEvent" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "wp_post_id"   INTEGER     UNIQUE,
  "title"        TEXT        NOT NULL,
  "description"  TEXT        NOT NULL DEFAULT '',
  "event_date"   TIMESTAMPTZ,
  "venue"        TEXT,
  "company"      TEXT,
  "external_url" TEXT,
  "is_published" BOOLEAN     NOT NULL DEFAULT TRUE,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SeminarEvent_event_date_idx"   ON "SeminarEvent" ("event_date" DESC);
CREATE INDEX IF NOT EXISTS "SeminarEvent_is_published_idx" ON "SeminarEvent" ("is_published");
CREATE INDEX IF NOT EXISTS "SeminarEvent_wp_post_id_idx"   ON "SeminarEvent" ("wp_post_id");
