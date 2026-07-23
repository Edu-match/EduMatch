-- 議員会館 電子チケット：コンテンツ（申込可能なセッション/プログラム）＋申込（電子チケット）
create table if not exists public.kaikan_contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  location text not null default '',
  starts_at timestamptz,
  capacity integer,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kaikan_applications (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.kaikan_contents(id) on delete cascade,
  profile_id uuid,
  name text not null,
  email text not null default '',
  note text not null default '',
  qr_token text not null unique,
  status text not null default 'confirmed',
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kaikan_applications_content_created_idx
  on public.kaikan_applications(content_id, created_at);
