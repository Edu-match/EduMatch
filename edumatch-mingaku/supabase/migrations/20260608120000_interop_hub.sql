-- Interop特設ページ専用テーブル（本体フォーラムとは完全に別）
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

-- category_id を持つサブカテゴリ（カテゴリ配下）
CREATE TABLE IF NOT EXISTS interop_sub_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES interop_categories(id) ON DELETE CASCADE,
  name         text NOT NULL,
  slug         text NOT NULL UNIQUE,
  description  text NOT NULL DEFAULT '',
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 初期カテゴリ
INSERT INTO interop_categories (name, slug, description, color, is_primary, sort_order) VALUES
  ('インフォメーション', 'information', '総合案内・タイムテーブル',         '#BDE8FB', true,  0),
  ('議員会館',          'giin-kaikan', '議員会館での取り組み・連携',        '#FBC9D4', false, 1),
  ('AI検定',            'ai-kentei',   'AI活用スキルの検定',                '#C7EFC0', false, 2),
  ('インタロップ',      'interop',     'Interop Tokyo 2026',                '#C9D4F6', false, 3),
  ('エデュマッチ',      'edumatch',    '教育×AIのプラットフォーム',         '#F6EBB0', false, 4),
  ('AI部',              'ai-bu',       'AI部の活動',                        '#E7CCF4', false, 5)
ON CONFLICT (slug) DO NOTHING;

-- 各カテゴリのサブカテゴリを初期投入
-- ※ category_id は slug で引く
INSERT INTO interop_sub_categories (category_id, name, slug, description, sort_order)
SELECT c.id, s.name, c.slug || '-' || s.suffix, s.descr, s.ord
FROM interop_categories c
JOIN (VALUES
  ('information', 'タイムテーブル',     'timetable',   'セッション・展示のスケジュール',   0),
  ('information', 'アクセス・会場案内', 'access',      '幕張メッセへのアクセス情報',       1),
  ('information', '出展者一覧',         'exhibitors',  '参加企業・団体の紹介',             2),
  ('giin-kaikan', '活動紹介',           'about',       '議員会館AI研究会の取り組み',       0),
  ('giin-kaikan', '登壇情報',           'session',     'セミナー・講演の詳細',             1),
  ('ai-kentei',   '検定とは',           'about',       'AI検定の概要・受験方法',           0),
  ('ai-kentei',   '試験スケジュール',   'schedule',    '検定試験の日程・会場',             1),
  ('interop',     'イベント概要',       'overview',    'Interop Tokyo 2026の概要',        0),
  ('interop',     'セミナー一覧',       'seminars',    '展示会場内セミナー',               1),
  ('edumatch',    'サービス紹介',       'service',     'エデュマッチの機能紹介',           0),
  ('edumatch',    'デモ展示',           'demo',        'ブースでのライブデモ情報',         1),
  ('ai-bu',       '部活紹介',           'about',       '青楓館高等学院 AI部の活動',        0),
  ('ai-bu',       '発表・展示内容',     'presentation','ブース展示・発表の詳細',           1)
) AS s(cat_slug, name, suffix, descr, ord) ON c.slug = s.cat_slug
ON CONFLICT (slug) DO NOTHING;
