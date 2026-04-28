-- ============================================================
-- 井戸端会議（フォーラム）テーブル
-- ============================================================

-- ─── forum_rooms ──────────────────────────────────────────
create table if not exists public.forum_rooms (
  id              text        primary key,
  name            text        not null,
  description     text        not null default '',
  emoji           text        not null default '',
  weekly_topic    text        not null default '',
  ai_discussion   boolean     not null default false,
  created_by      uuid        references public."Profile"(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.forum_rooms enable row level security;

-- 誰でも読める
create policy "forum_rooms_select" on public.forum_rooms
  for select using (true);

-- ログインユーザーのみ作成
create policy "forum_rooms_insert" on public.forum_rooms
  for insert with check (auth.uid() is not null);

-- 管理者のみ更新
create policy "forum_rooms_update" on public.forum_rooms
  for update using (
    exists (
      select 1 from public."Profile"
      where id = auth.uid() and role = 'ADMIN'
    )
  );

-- 管理者のみ削除
create policy "forum_rooms_delete" on public.forum_rooms
  for delete using (
    exists (
      select 1 from public."Profile"
      where id = auth.uid() and role = 'ADMIN'
    )
  );

-- ─── forum_posts ──────────────────────────────────────────
create table if not exists public.forum_posts (
  id                  text        primary key default gen_random_uuid()::text,
  room_id             text        not null references public.forum_rooms(id) on delete cascade,
  author_id           uuid        references public."Profile"(id) on delete set null,
  author_name         text        not null,
  author_role         text        not null default '一般',
  body                text        not null,
  related_article_url text,
  is_pinned           boolean     not null default false,
  is_hidden           boolean     not null default false,
  ai_kentei_passed    boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.forum_posts enable row level security;

-- 非表示でない投稿は誰でも読める（管理者は非表示も読める）
create policy "forum_posts_select" on public.forum_posts
  for select using (
    is_hidden = false
    or exists (
      select 1 from public."Profile"
      where id = auth.uid() and role = 'ADMIN'
    )
  );

-- 誰でも投稿可能（ゲスト含む）
create policy "forum_posts_insert" on public.forum_posts
  for insert with check (true);

-- 管理者のみ更新（pin / hide）
create policy "forum_posts_update" on public.forum_posts
  for update using (
    exists (
      select 1 from public."Profile"
      where id = auth.uid() and role = 'ADMIN'
    )
  );

-- 管理者のみ削除
create policy "forum_posts_delete" on public.forum_posts
  for delete using (
    exists (
      select 1 from public."Profile"
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create index if not exists forum_posts_room_id_created_at_idx
  on public.forum_posts (room_id, created_at desc);

-- ─── forum_replies ────────────────────────────────────────
create table if not exists public.forum_replies (
  id          text        primary key default gen_random_uuid()::text,
  post_id     text        not null references public.forum_posts(id) on delete cascade,
  author_id   uuid        references public."Profile"(id) on delete set null,
  author_name text        not null,
  author_role         text        not null default '一般',
  body                text        not null,
  ai_kentei_passed    boolean     not null default false,
  created_at          timestamptz not null default now()
);

alter table public.forum_replies enable row level security;

-- 誰でも読める
create policy "forum_replies_select" on public.forum_replies
  for select using (true);

-- 誰でも投稿可能
create policy "forum_replies_insert" on public.forum_replies
  for insert with check (true);

-- 管理者のみ削除
create policy "forum_replies_delete" on public.forum_replies
  for delete using (
    exists (
      select 1 from public."Profile"
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create index if not exists forum_replies_post_id_idx
  on public.forum_replies (post_id, created_at asc);

-- ─── forum_likes ──────────────────────────────────────────
-- 投稿いいね と 返信いいね を1テーブルで管理
create table if not exists public.forum_likes (
  id          text        primary key default gen_random_uuid()::text,
  target_id   text        not null,  -- forum_posts.id or forum_replies.id
  target_type text        not null,  -- 'post' | 'reply'
  user_id     uuid        references public."Profile"(id) on delete cascade,
  session_id  text,                  -- ゲスト用セッション識別子
  created_at  timestamptz not null default now(),
  -- ログインユーザーは (target_id, user_id) がユニーク
  constraint forum_likes_user_unique unique (target_id, user_id),
  constraint forum_likes_has_identity check (user_id is not null or session_id is not null)
);

alter table public.forum_likes enable row level security;

-- 誰でも読める
create policy "forum_likes_select" on public.forum_likes
  for select using (true);

-- 誰でも作成可能
create policy "forum_likes_insert" on public.forum_likes
  for insert with check (true);

-- 自分のいいねのみ削除可能
create policy "forum_likes_delete" on public.forum_likes
  for delete using (
    user_id = auth.uid()
    or user_id is null
  );

create index if not exists forum_likes_target_idx
  on public.forum_likes (target_id, target_type);

-- ─── updated_at 自動更新トリガー ────────────────────────
create or replace function public.forum_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger forum_rooms_set_updated_at
  before update on public.forum_rooms
  for each row execute function public.forum_set_updated_at();

create trigger forum_posts_set_updated_at
  before update on public.forum_posts
  for each row execute function public.forum_set_updated_at();
