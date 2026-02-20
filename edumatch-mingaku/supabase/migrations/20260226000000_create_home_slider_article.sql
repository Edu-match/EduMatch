-- トップスライダーに表示する記事（ADMINが選択）。表示順は position の昇順。
CREATE TABLE IF NOT EXISTS public."HomeSliderArticle" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "post_id"    TEXT NOT NULL REFERENCES public."Post"("id") ON DELETE CASCADE,
  "position"   INT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeSliderArticle_post_id_key" ON public."HomeSliderArticle" ("post_id");
CREATE INDEX IF NOT EXISTS "HomeSliderArticle_position_idx" ON public."HomeSliderArticle" ("position");

COMMENT ON TABLE public."HomeSliderArticle" IS 'トップページスライダーに表示する記事（ADMINが選択）。';
