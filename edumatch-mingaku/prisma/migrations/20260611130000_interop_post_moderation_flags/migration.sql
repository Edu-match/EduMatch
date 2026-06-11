-- AIモデレーション（危険投稿の自動非表示）用フラグを追加。既存データ非破壊。
ALTER TABLE "interop_posts" ADD COLUMN IF NOT EXISTS "auto_flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "interop_posts" ADD COLUMN IF NOT EXISTS "flag_reason" TEXT NOT NULL DEFAULT '';
