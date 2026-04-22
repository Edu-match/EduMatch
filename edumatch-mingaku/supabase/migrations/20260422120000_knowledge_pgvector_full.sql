-- =============================================================================
-- ナレッジ RAG（pgvector）一式: 拡張 + テーブル + インデックス + RLS + RPC
-- Supabase SQL Editor でも `supabase db push` / migrate でも流せる想定。
-- 再実行時: ポリシーは DROP IF EXISTS 済み。テーブルは IF NOT EXISTS。
-- =============================================================================

-- 1) pgvector
create extension if not exists vector;

-- 2) 文書メタデータ
create table if not exists public.knowledge_documents (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  source_type       text not null,
  source_type_other text,
  source_url        text,
  description       text,
  created_at        timestamptz not null default now(),
  constraint knowledge_documents_source_type_check check (
    source_type in (
      'curriculum_elementary',
      'curriculum_middle',
      'curriculum_high',
      'mext_giga',
      'mext_digital',
      'mext_special',
      'mext_guideline',
      'oecd_learning',
      'oecd_teaching',
      'oecd_other',
      'school_standard',
      'education_plan',
      'cue_answer',
      'law_education',
      'other'
    )
  )
);

comment on table public.knowledge_documents is 'RAG用 教育公的文書メタデータ';
comment on column public.knowledge_documents.source_type_other is 'source_type = other のときの自由記述ラベル';

-- 3) チャンク + ベクトル
create table if not exists public.knowledge_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  chunk_index int  not null,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks (document_id);

-- 4) 類似検索用インデックス（コサイン距離 / HNSW）
create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- 5) 再実行用: 既存ポリシーを削除（テーブル作成後にのみ実行する）
drop policy if exists "admin_all_knowledge_documents" on public.knowledge_documents;
drop policy if exists "authenticated_read_knowledge_documents" on public.knowledge_documents;
drop policy if exists "admin_all_knowledge_chunks" on public.knowledge_chunks;
drop policy if exists "authenticated_read_knowledge_chunks" on public.knowledge_chunks;

-- 6) RLS
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

-- ADMIN: 全操作（"Profile" は Prisma の実テーブル名）
create policy "admin_all_knowledge_documents"
  on public.knowledge_documents
  for all
  using (
    exists (
      select 1
      from public."Profile" p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
    )
  )
  with check (
    exists (
      select 1
      from public."Profile" p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
    )
  );

create policy "authenticated_read_knowledge_documents"
  on public.knowledge_documents
  for select
  using (auth.role() = 'authenticated');

create policy "admin_all_knowledge_chunks"
  on public.knowledge_chunks
  for all
  using (
    exists (
      select 1
      from public."Profile" p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
    )
  )
  with check (
    exists (
      select 1
      from public."Profile" p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
    )
  );

create policy "authenticated_read_knowledge_chunks"
  on public.knowledge_chunks
  for select
  using (auth.role() = 'authenticated');

-- service_role は RLS をバイパスするため、サーバー側バッチ用にそのまま利用可

-- 7) 類似チャンク検索 RPC（アプリから supabase.rpc 呼び出し）
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count     int   default 3,
  match_threshold float default 0.75
)
returns table (
  id              uuid,
  document_id     uuid,
  chunk_index     int,
  content         text,
  similarity      float,
  doc_title       text,
  doc_source_type text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    kc.id,
    kc.document_id,
    kc.chunk_index,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::float as similarity,
    kd.title::text                                   as doc_title,
    kd.source_type::text                             as doc_source_type
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where kc.embedding is not null
    and (1 - (kc.embedding <=> query_embedding)) >= match_threshold
  order by kc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

comment on function public.match_knowledge_chunks is 'クエリ埋め込みとコサイン類似度でナレッジチャンクを取得';

-- 8) PostgREST のスキーマキャッシュ更新（存在すれば効く）
notify pgrst, 'reload schema';
