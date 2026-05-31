-- AI が日次で選んだカテゴリルーム用コンテンツ（記事・サービス・動画・イベント）
CREATE TABLE IF NOT EXISTS public.forum_category_content_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  sub_category_id UUID NOT NULL REFERENCES public.forum_sub_categories(id) ON DELETE CASCADE,
  content_kind    TEXT NOT NULL,
  source_type     TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  thumbnail_url   TEXT,
  href            TEXT NOT NULL,
  meta            TEXT,
  rank_order      INT NOT NULL DEFAULT 0,
  refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, sub_category_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS forum_category_content_cache_lookup_idx
  ON public.forum_category_content_cache (category_id, sub_category_id, content_kind, rank_order);

ALTER TABLE public.forum_category_content_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_category_content_cache_select ON public.forum_category_content_cache;
CREATE POLICY forum_category_content_cache_select ON public.forum_category_content_cache
  FOR SELECT USING (TRUE);

GRANT SELECT ON public.forum_category_content_cache TO anon, authenticated;
