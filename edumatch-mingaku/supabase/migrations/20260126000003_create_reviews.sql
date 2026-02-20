-- Review テーブル作成
CREATE TABLE IF NOT EXISTS public."Review" (
  "id"            TEXT        NOT NULL PRIMARY KEY,
  "service_id"    TEXT        NOT NULL,
  "user_id"       UUID        NULL,
  "author_name"   TEXT        NOT NULL,
  "rating"        INTEGER     NULL,
  "body"          TEXT        NOT NULL,
  "is_approved"   BOOLEAN     NOT NULL DEFAULT TRUE,
  "wp_comment_id" INTEGER     NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Review_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES public."Service"("id") ON DELETE CASCADE,
  CONSTRAINT "Review_user_id_fkey"
    FOREIGN KEY ("user_id")    REFERENCES public."Profile"("id") ON DELETE SET NULL,
  CONSTRAINT "Review_rating_check"
    CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_wp_comment_id_key"
  ON public."Review" ("wp_comment_id")
  WHERE "wp_comment_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Review_service_id_idx"  ON public."Review" ("service_id");
CREATE INDEX IF NOT EXISTS "Review_user_id_idx"     ON public."Review" ("user_id");
CREATE INDEX IF NOT EXISTS "Review_created_at_idx"  ON public."Review" ("created_at" DESC);

-- Service に review_count カラムを追加（非正規化キャッシュ）
ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "review_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Service_review_count_idx" ON public."Service" ("review_count");

COMMENT ON TABLE  public."Review"              IS 'サービスへの口コミ・レビュー';
COMMENT ON COLUMN public."Review"."rating"     IS '評価（1〜5）。旧コメントは NULL';
COMMENT ON COLUMN public."Review"."wp_comment_id" IS 'WordPress コメントID（重複インポート防止）';
COMMENT ON COLUMN public."Service"."review_count" IS '口コミ数（非正規化キャッシュ）';
