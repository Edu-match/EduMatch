-- Interop掲示板の投稿に「固定（運営のお知らせ・記事）」フラグを追加
alter table interop_posts
  add column if not exists is_pinned boolean not null default false;
