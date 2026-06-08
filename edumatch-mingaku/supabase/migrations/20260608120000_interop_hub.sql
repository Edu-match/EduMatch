-- Interop特設ページ専用の「井戸端コピー」データ（本体フォーラムとは完全に別）
-- Supabase SQL Editor で実行する。

CREATE TABLE IF NOT EXISTS interop_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT '#C9D4F6',
  is_primary  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interop_sub_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text NOT NULL UNIQUE,
  icon         text,
  content_kind text NOT NULL DEFAULT 'article',
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 初期カテゴリ（インフォメーションを中心に）
INSERT INTO interop_categories (name, slug, description, color, is_primary, sort_order) VALUES
  ('インフォメーション', 'information', '案内・タイムテーブルなどの総合インフォメーション', '#BDE8FB', true, 0),
  ('議員会館',         'giin-kaikan', '議員会館での取り組み・連携',                 '#FBC9D4', false, 1),
  ('AI検定',           'ai-kentei',   'AI活用スキルの検定',                         '#C7EFC0', false, 2),
  ('インタロップ',     'interop',     'Interop Tokyo 2026',                         '#C9D4F6', false, 3),
  ('エデュマッチ',     'edumatch',    '教育×AIのプラットフォーム',                  '#F6EBB0', false, 4),
  ('AI部',             'ai-bu',       'AI部の活動',                                 '#E7CCF4', false, 5)
ON CONFLICT (slug) DO NOTHING;

-- 初期サブカテゴリ（面）
INSERT INTO interop_sub_categories (name, slug, content_kind, sort_order) VALUES
  ('案内記事', 'guide',       'article',     0),
  ('動画',     'media',       'media',       1),
  ('イベント', 'events-info', 'events-info', 2),
  ('コミュニティ', 'community','community',   3)
ON CONFLICT (slug) DO NOTHING;
