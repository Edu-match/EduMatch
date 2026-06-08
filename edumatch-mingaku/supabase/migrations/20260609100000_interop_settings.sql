-- Interop特設ページのサイト設定（テキスト・テーマ等のkey-value）
create table if not exists interop_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
