-- 井戸端会議: 大カテゴリ / サブカテゴリ（運営管理）
-- 実行場所: Supabase SQL Editor / supabase db push
--
-- 概要:
-- - forum_categories: 運営が管理する「大カテゴリ」（マップビューのバブル）
-- - forum_sub_categories: 大カテゴリ内のサブカテゴリ（Article / Service / Media / Events Info / コミュニティ）
-- - forum_rooms に category_id / sub_category_id を追加し、(category_id, sub_category_id) で
--   オンデマンド生成されるカテゴリルームを一意に特定する
--
-- セキュリティ方針:
-- - SELECT は誰でも可（公開マップ表示用）
-- - INSERT/UPDATE/DELETE は ADMIN のみ（app_private.is_forum_admin() を再利用）

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 大カテゴリ ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#FFB5C8',  -- バブルのパステルカラー
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── サブカテゴリ ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_sub_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,         -- 表示名（例: "Article" / "コミュニティ"）
  slug       TEXT NOT NULL UNIQUE,  -- 例: "article" / "community"
  icon         TEXT,                  -- lucide アイコン名
  content_kind TEXT NOT NULL DEFAULT 'community', -- community|article|service|media|events-info
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── デフォルトのサブカテゴリ5種（Conference → コミュニティに改名・上中央配置） ───
INSERT INTO public.forum_sub_categories (name, slug, icon, content_kind, sort_order)
VALUES
  ('コミュニティ', 'community',    'MessageCircle', 'community',   0),
  ('Article',      'article',      'FileText',      'article',     1),
  ('Service',      'service',      'Briefcase',     'service',     2),
  ('Media',        'media',        'Video',         'media',       3),
  ('Events Info',  'events-info',  'Calendar',      'events-info', 4)
ON CONFLICT (slug) DO NOTHING;

-- ─── forum_rooms にカテゴリ参照を追加 ───────────────────────
ALTER TABLE public.forum_rooms
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.forum_sub_categories(id) ON DELETE SET NULL;

-- カテゴリ×サブカテゴリでルームを1つに特定する
CREATE UNIQUE INDEX IF NOT EXISTS forum_rooms_category_sub_unique
  ON public.forum_rooms (category_id, sub_category_id)
  WHERE category_id IS NOT NULL AND sub_category_id IS NOT NULL;

-- ─── updated_at 自動更新トリガー ───────────────────────────
CREATE OR REPLACE FUNCTION app_private.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_categories_touch ON public.forum_categories;
CREATE TRIGGER trg_forum_categories_touch
  BEFORE UPDATE ON public.forum_categories
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_forum_sub_categories_touch ON public.forum_sub_categories;
CREATE TRIGGER trg_forum_sub_categories_touch
  BEFORE UPDATE ON public.forum_sub_categories
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_sub_categories ENABLE ROW LEVEL SECURITY;

-- 公開 SELECT
DROP POLICY IF EXISTS forum_categories_select ON public.forum_categories;
CREATE POLICY forum_categories_select ON public.forum_categories
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS forum_sub_categories_select ON public.forum_sub_categories;
CREATE POLICY forum_sub_categories_select ON public.forum_sub_categories
  FOR SELECT USING (TRUE);

-- 書き込みは ADMIN のみ
DROP POLICY IF EXISTS forum_categories_admin_all ON public.forum_categories;
CREATE POLICY forum_categories_admin_all ON public.forum_categories
  FOR ALL
  USING (app_private.is_forum_admin())
  WITH CHECK (app_private.is_forum_admin());

DROP POLICY IF EXISTS forum_sub_categories_admin_all ON public.forum_sub_categories;
CREATE POLICY forum_sub_categories_admin_all ON public.forum_sub_categories
  FOR ALL
  USING (app_private.is_forum_admin())
  WITH CHECK (app_private.is_forum_admin());

GRANT SELECT ON public.forum_categories TO anon, authenticated;
GRANT SELECT ON public.forum_sub_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forum_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forum_sub_categories TO authenticated;
