-- Interop特設：本体エデュマッチからの関連コンテンツ（自動抽出設定＋手動キュレーション）

-- 1) サブカテゴリに自動抽出の設定列を追加
alter table interop_sub_categories
  add column if not exists content_kinds text[] not null default '{}',
  add column if not exists content_query text not null default '';

-- 2) 手動キュレーション（ピン留め／除外）テーブル
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
