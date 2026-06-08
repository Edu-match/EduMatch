-- Interop特設ページ：サブカテゴリ掲示板（来場者が投稿。ログイン不要）
-- 井戸端(forum)とは完全に別データ。

create table if not exists interop_posts (
  id              uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references interop_sub_categories(id) on delete cascade,
  author_name     text not null default '匿名',
  author_role     text not null default '',
  body            text not null,
  is_hidden       boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists interop_posts_sub_created_idx
  on interop_posts (sub_category_id, created_at desc);
