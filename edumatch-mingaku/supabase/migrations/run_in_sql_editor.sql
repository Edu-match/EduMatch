-- ============================================================
-- Supabase SQL エディターで実行する用
-- 記事のカテゴリ（タグ）を管理するテーブルを作成
-- ============================================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS public."ArticleTag" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        TEXT NOT NULL,
  "slug"        TEXT,
  "sort_order"  INT NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ArticleTag_name_key" UNIQUE ("name")
);

-- インデックス（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS "ArticleTag_sort_order_idx" ON public."ArticleTag" ("sort_order");
CREATE INDEX IF NOT EXISTS "ArticleTag_name_idx" ON public."ArticleTag" ("name");

-- slug は NULL を除いてユニーク（部分一意インデックス）
DROP INDEX IF EXISTS public."ArticleTag_slug_key";
CREATE UNIQUE INDEX "ArticleTag_slug_key" ON public."ArticleTag" ("slug") WHERE "slug" IS NOT NULL;

-- テーブルコメント
COMMENT ON TABLE public."ArticleTag" IS '記事のカテゴリ（タグ）マスター。WordPress post_tag 由来のタグを管理';
