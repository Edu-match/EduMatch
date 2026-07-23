-- 招待コード（議員会館サミット）：Peatix全体申込者へ手動配布する使い捨てコード
create table if not exists public.kaikan_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  note text not null default '',
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists kaikan_invite_codes_redeemed_by_idx on public.kaikan_invite_codes (redeemed_by);

-- コンテンツに終了日時を追加（時間重複の判定に使用）
alter table public.kaikan_contents add column if not exists ends_at timestamptz;
