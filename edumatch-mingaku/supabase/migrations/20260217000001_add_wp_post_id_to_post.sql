-- Post に WordPress の post_id を保持し、再インポート時に同一記事とマッチして
-- title/content/日付のみ更新し、favorite_count を引き継げるようにする

ALTER TABLE public."Post"
  ADD COLUMN IF NOT EXISTS "wp_post_id" INT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Post_wp_post_id_key"
  ON public."Post" ("wp_post_id") WHERE "wp_post_id" IS NOT NULL;

COMMENT ON COLUMN public."Post"."wp_post_id" IS 'WordPress の post_id。再インポート時にマッチし、favorite_count を上書きしないために使用。';
