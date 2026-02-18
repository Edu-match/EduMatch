-- 運営情報（サイト更新情報）用テーブル
-- WordPress エクスポートや手動登録の「お知らせ・運営記事」を格納

CREATE TABLE IF NOT EXISTS public."SiteUpdate" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"        TEXT NOT NULL,
  "body"         TEXT NOT NULL DEFAULT '',
  "excerpt"       TEXT,
  "published_at" TIMESTAMPTZ NOT NULL,
  "link"          TEXT,
  "wp_post_id"    INT UNIQUE,
  "thumbnail_url" TEXT,
  "category"      TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "SiteUpdate_published_at_idx" ON public."SiteUpdate" ("published_at" DESC);
CREATE INDEX IF NOT EXISTS "SiteUpdate_wp_post_id_idx"   ON public."SiteUpdate" ("wp_post_id") WHERE "wp_post_id" IS NOT NULL;

COMMENT ON TABLE public."SiteUpdate" IS '運営記事・サイト更新情報。WordPress インポートまたは手動登録。';
