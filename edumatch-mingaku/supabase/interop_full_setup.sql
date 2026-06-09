-- ============================================================
-- Interop 教育AIサミット 特設ページ — フルセットアップ SQL
-- Supabase SQL Editor にそのまま貼り付けて実行してください。
-- 冪等（何度実行してもOK）。既存データは消しません。
-- ============================================================

-- 1) 大カテゴリ
create table if not exists interop_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  color       text not null default '#C9D4F6',
  is_primary  boolean not null default false,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) サブカテゴリ
create table if not exists interop_sub_categories (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references interop_categories(id) on delete cascade,
  name         text not null,
  slug         text not null unique,
  description  text not null default '',
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- 関連コンテンツ（自動抽出）の設定列
alter table interop_sub_categories
  add column if not exists content_kinds text[] not null default '{}',
  add column if not exists content_query text not null default '';

-- 3) 掲示板の投稿
create table if not exists interop_posts (
  id              uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references interop_sub_categories(id) on delete cascade,
  author_name     text not null default '匿名',
  author_role     text not null default '',
  body            text not null,
  is_hidden       boolean not null default false,
  is_pinned       boolean not null default false,
  created_at      timestamptz not null default now()
);
alter table interop_posts
  add column if not exists is_pinned boolean not null default false;
create index if not exists interop_posts_sub_created_idx
  on interop_posts (sub_category_id, created_at desc);

-- 4) サイト設定（テキスト・テーマ・ジオフェンス等の key-value）
create table if not exists interop_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 5) 関連コンテンツの手動キュレーション（ピン留め／除外）
create table if not exists interop_content_pins (
  id              uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references interop_sub_categories(id) on delete cascade,
  source_type     text not null,
  source_id       text not null,
  title           text not null,
  description     text not null default '',
  thumbnail_url   text,
  href            text not null,
  meta            text,
  is_hidden       boolean not null default false,
  rank_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists interop_content_pins_sub_rank_idx
  on interop_content_pins (sub_category_id, rank_order);

-- ============================================================
-- 初期データ（カテゴリ6＋サブカテゴリ24）。管理画面から編集可能。
-- ============================================================
insert into interop_categories (name, slug, description, color, is_primary, sort_order) values
  ('インフォメーション', 'information', '総合案内・タイムテーブル',  '#BDE8FB', true,  0),
  ('議員会館',          'giin-kaikan', '議員会館での取り組み・連携', '#FBC9D4', false, 1),
  ('AI検定',            'ai-kentei',   'AI活用スキルの検定',         '#C7EFC0', false, 2),
  ('インタロップ',      'interop',     'Interop Tokyo 2026',         '#C9D4F6', false, 3),
  ('エデュマッチ',      'edumatch',    '教育×AIのプラットフォーム',  '#F6EBB0', false, 4),
  ('AI部',              'ai-bu',       'AI部の活動',                 '#E7CCF4', false, 5)
on conflict (slug) do nothing;

insert into interop_sub_categories (category_id, name, slug, description, sort_order)
select c.id, s.name, s.slug, s.description, s.sort_order
from interop_categories c
join (values
  ('information', 'タイムテーブル',        'information-timetable',  '3日間のセッション・展示スケジュール一覧',      0),
  ('information', 'アクセス・会場案内',    'information-access',     '幕張メッセへのアクセス方法・ホール配置図',    1),
  ('information', '出展者一覧',            'information-exhibitors', '教育AIサミット参加企業・団体の紹介',          2),
  ('information', '来場者へのご案内',      'information-visitor',    '入場方法・注意事項・よくある質問',            3),
  ('giin-kaikan', 'AI×教育研究会について', 'giin-about',            '超党派の議員によるAI×教育の立法・政策研究会', 0),
  ('giin-kaikan', '政策提言',              'giin-policy',           '文部科学省・デジタル庁への提言内容',          1),
  ('giin-kaikan', '登壇セッション',        'giin-session',          'Interop会期中の議員・専門家パネル',           2),
  ('giin-kaikan', '連携・賛同団体',        'giin-partners',         '共同声明・協定を結ぶ教育・産業団体一覧',      3),
  ('ai-kentei',   '検定概要',              'ai-kentei-about',       'AI検定の目的・レベル区分・認定基準',          0),
  ('ai-kentei',   '試験スケジュール',      'ai-kentei-schedule',    '会期中の受験日時・ブース申込方法',            1),
  ('ai-kentei',   'サンプル問題体験',      'ai-kentei-demo',        'ブースで実際に体験できるデモ問題',            2),
  ('ai-kentei',   '合格特典・活用事例',    'ai-kentei-benefits',    '合格者の活用事例と特典プログラム',            3),
  ('interop',     'Interop Tokyo 2026とは','interop-overview',      '世界最大級のネットワーク&IT展示会の概要',     0),
  ('interop',     'Education×AIゾーン',    'interop-edu-ai-zone',   '教育AI専用の展示エリアとブース紹介',          1),
  ('interop',     '展示会場内セミナー',    'interop-seminars',      'AIと教育をテーマにした無料セミナー一覧',      2),
  ('interop',     'ShowNet展示',           'interop-shownet',       'Interop名物・ライブネットワーク構築デモ',     3),
  ('edumatch',    'エデュマッチとは',      'edumatch-about',        '教育サービスと学習者をつなぐプラットフォーム',0),
  ('edumatch',    'ブースデモ体験',        'edumatch-demo',         '会場でその場から使えるライブデモのご案内',    1),
  ('edumatch',    'みんがくとの連携',      'edumatch-mingaku',      '通信制高校向けエドテック連携の詳細',          2),
  ('edumatch',    'お問い合わせ',          'edumatch-contact',      '掲載・提携・取材のお問い合わせ先',            3),
  ('ai-bu',       'AI部の活動紹介',        'ai-bu-about',           '青楓館高等学院 AI部の設立経緯と活動内容',     0),
  ('ai-bu',       '展示・発表内容',        'ai-bu-presentation',    'Interop会場でのプロジェクト発表の詳細',       1),
  ('ai-bu',       '青楓館高等学院とは',    'ai-bu-school',          '通信制高校で学ぶPBL・探究活動の紹介',         2),
  ('ai-bu',       '体験・見学のご案内',    'ai-bu-visit',           '生徒によるデモ体験・学校説明の申込方法',      3)
) as s(cat_slug, name, slug, description, sort_order)
  on c.slug = s.cat_slug
on conflict (slug) do update
  set name = excluded.name, description = excluded.description,
      sort_order = excluded.sort_order, updated_at = now();
