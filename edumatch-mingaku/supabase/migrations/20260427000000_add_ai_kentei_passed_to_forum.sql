-- ============================================================
-- forum_posts / forum_replies に AI検定合格フラグを追加
-- ============================================================

alter table public.forum_posts
  add column if not exists ai_kentei_passed boolean not null default false;

alter table public.forum_replies
  add column if not exists ai_kentei_passed boolean not null default false;
