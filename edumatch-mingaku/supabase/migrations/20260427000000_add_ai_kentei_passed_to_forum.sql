-- ============================================================
-- forum_posts / forum_replies に AI検定合格フラグを追加
-- ※ forum_posts が無い場合は先に 20260425000000_add_forum_tables.sql を実行すること。
-- ※ 新規で 20260425 に列が含まれている場合は本マイグレーションは no-op（IF NOT EXISTS）。
-- ============================================================

alter table public.forum_posts
  add column if not exists ai_kentei_passed boolean not null default false;

alter table public.forum_replies
  add column if not exists ai_kentei_passed boolean not null default false;
