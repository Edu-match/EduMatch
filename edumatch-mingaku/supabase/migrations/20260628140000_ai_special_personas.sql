-- 歴史上の人物などの特別AIペルソナ（ネット検索生成＋AI法的チェック結果を保持）
create table if not exists public.ai_special_personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  persona_prompt text not null default '',
  values_text text not null default '',
  expertise text[] not null default '{}',
  avatar_url text,
  source text not null default 'historical',
  legal_status text not null default 'ok',
  legal_note text not null default '',
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
