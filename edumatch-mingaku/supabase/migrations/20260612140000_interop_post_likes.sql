-- Interop掲示板：投稿へのいいね（来場者はログイン不要・端末ごとに1回）

create table if not exists interop_post_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references interop_posts(id) on delete cascade,
  voter_key  text not null,
  created_at timestamptz not null default now(),
  unique (post_id, voter_key)
);

create index if not exists interop_post_likes_post_id_idx
  on interop_post_likes (post_id);
