-- Interop特設：サブカテゴリ配下の「トピック」機能
-- 1件でも設定すると投稿前にトピック選択画面を挟む。
-- トピック単位で参考URL・検索コンテンツ（kinds/query）を上書きできる。

create table if not exists interop_board_topics (
  id              uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references interop_sub_categories(id) on delete cascade,
  name            text not null,
  description     text not null default '',
  url             text not null default '',
  content_kinds   text[] not null default '{}',
  content_query   text not null default '',
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists interop_board_topics_sub_sort_idx
  on interop_board_topics (sub_category_id, sort_order);

-- 投稿のトピック紐づけ（トピック削除時は投稿は残してNULLへ）
alter table interop_posts
  add column if not exists topic_id uuid references interop_board_topics(id) on delete set null;

create index if not exists interop_posts_topic_idx on interop_posts (topic_id);
