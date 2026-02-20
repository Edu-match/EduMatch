-- 記事の表示用著者名（CSV/WordPress の著者と一致させる用）。未設定時は provider.name を使用
ALTER TABLE public."Post"
  ADD COLUMN IF NOT EXISTS "author_display_name" TEXT NULL;

COMMENT ON COLUMN public."Post"."author_display_name" IS 'CSV/WordPress の著者表示名。未設定時は provider.name を使用';
