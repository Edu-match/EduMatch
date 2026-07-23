-- サブカテゴリ（サテライト/一般カテゴリ配下のノード）に「タップ時の遷移先」を持たせる。
-- link_url が空 → 掲示板（投稿ページ）へ。link_url が設定済 → その外部リンクへ遷移。
-- 既存の url（参考リンク：概要下のサムネ表示）とは用途が別。
ALTER TABLE public.interop_sub_categories
  ADD COLUMN IF NOT EXISTS link_url TEXT NOT NULL DEFAULT '';
