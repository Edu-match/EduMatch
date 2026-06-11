-- 論点ごとの参考リンク（サムネ表示）＋サテライト(サブカテゴリ)の参考URL（非破壊）
ALTER TABLE "interop_topics" ADD COLUMN IF NOT EXISTS "point_links" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "interop_sub_categories" ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL DEFAULT '';
