-- 井戸端会議 常設化 Epic A: ログインユーザーの投稿を Profile に紐付ける（匿名投稿は NULL のまま・非破壊）
ALTER TABLE "interop_posts" ADD COLUMN IF NOT EXISTS "author_id" UUID;

DO $$ BEGIN
  ALTER TABLE "interop_posts"
    ADD CONSTRAINT "interop_posts_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "interop_posts_author_id_idx" ON "interop_posts"("author_id");
