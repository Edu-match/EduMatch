-- SiteUpdateテーブルにshow_in_sliderカラムを追加
-- トップページのヒーロースライダーに表示する運営記事をADMINが個別管理できるようにする

ALTER TABLE "SiteUpdate"
  ADD COLUMN IF NOT EXISTS show_in_slider BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "SiteUpdate_show_in_slider_idx"
  ON "SiteUpdate"(show_in_slider);

-- 既存の運営記事は全てスライダーに表示する（移行前の動作を維持）
UPDATE "SiteUpdate"
  SET show_in_slider = true
  WHERE show_in_slider = false;
