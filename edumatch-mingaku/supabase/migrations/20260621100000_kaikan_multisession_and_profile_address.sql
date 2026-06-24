-- 申込者の住所（アカウント基礎情報）
alter table public."Profile" add column if not exists postal_code text;
alter table public."Profile" add column if not exists address text;

-- 1回の申込で複数セッションを1チケットにまとめる共有トークン
alter table public.kaikan_applications add column if not exists ticket_token text;
create index if not exists kaikan_applications_ticket_token_idx on public.kaikan_applications (ticket_token);
