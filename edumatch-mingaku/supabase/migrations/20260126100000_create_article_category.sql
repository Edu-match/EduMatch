-- 記事・サービスの固定カテゴリマスターテーブル（22個の大カテゴリ）
-- Post.category / Service.category はこのテーブルの name を参照
-- タグ（Post.tags / Service.tags）は別途自由入力の配列として管理

CREATE TABLE IF NOT EXISTS public."ArticleCategory" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        TEXT NOT NULL,
  "slug"        TEXT,
  "sort_order"  INT NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ArticleCategory_name_key" UNIQUE ("name")
);

-- 表示順・検索用インデックス
CREATE INDEX IF NOT EXISTS "ArticleCategory_sort_order_idx" ON public."ArticleCategory" ("sort_order");
CREATE INDEX IF NOT EXISTS "ArticleCategory_name_idx" ON public."ArticleCategory" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleCategory_slug_key" ON public."ArticleCategory" ("slug") WHERE "slug" IS NOT NULL;

COMMENT ON TABLE public."ArticleCategory" IS '記事・サービスの固定カテゴリマスター（AI, ICT, 教育, 塾等22個）。Post.category / Service.category が参照。';
