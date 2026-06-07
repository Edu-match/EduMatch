-- 井戸端：面（大カテゴリ×サブカテゴリ）への手動コンテンツ固定＋炎マーク手動上書き
-- Supabase SQL Editor で実行する（このリポは手動適用運用）。

-- 1) 炎マークの手動上書き（null=自動 / true=強制ON / false=強制OFF）
ALTER TABLE forum_rooms
  ADD COLUMN IF NOT EXISTS hot_override boolean;

-- 2) 面に固定表示するコンテンツ（AI自動選定より優先して先頭に出す）
CREATE TABLE IF NOT EXISTS forum_pinned_content (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid NOT NULL,
  sub_category_id uuid NOT NULL,
  content_kind    text NOT NULL,
  source_type     text NOT NULL,
  source_id       text NOT NULL,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  thumbnail_url   text,
  href            text NOT NULL,
  meta            text,
  rank_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS forum_pinned_content_unique
  ON forum_pinned_content (category_id, sub_category_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS forum_pinned_content_lookup_idx
  ON forum_pinned_content (category_id, sub_category_id, rank_order);
