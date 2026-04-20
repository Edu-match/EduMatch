-- pgvector 拡張の有効化（supabase では public スキーマに存在）
create extension if not exists vector;

-- ナレッジ文書テーブル
create table if not exists knowledge_documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  source_type text not null check (source_type in (
    'curriculum',
    'mext_guideline',
    'oecd_compass',
    'school_standard',
    'education_plan',
    'other'
  )),
  source_url  text,
  description text,
  created_at  timestamptz not null default now()
);

-- RLS（管理者のみ書き込み、全認証ユーザー読み取り）
alter table knowledge_documents enable row level security;

create policy "admin_all_knowledge_documents"
  on knowledge_documents
  for all
  using (
    exists (
      select 1 from "Profile"
      where "Profile".id = auth.uid()
        and "Profile".role = 'ADMIN'
    )
  );

create policy "authenticated_read_knowledge_documents"
  on knowledge_documents
  for select
  using (auth.role() = 'authenticated');

-- ナレッジチャンクテーブル
create table if not exists knowledge_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index   int  not null,
  content       text not null,
  embedding     vector(1536),
  created_at    timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- ベクトル検索用 HNSW インデックス
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- RLS
alter table knowledge_chunks enable row level security;

create policy "admin_all_knowledge_chunks"
  on knowledge_chunks
  for all
  using (
    exists (
      select 1 from "Profile"
      where "Profile".id = auth.uid()
        and "Profile".role = 'ADMIN'
    )
  );

create policy "authenticated_read_knowledge_chunks"
  on knowledge_chunks
  for select
  using (auth.role() = 'authenticated');

-- 類似チャンク検索 RPC
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  match_count     int     default 3,
  match_threshold float   default 0.75
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
language sql stable
as $$
  select
    kc.id,
    kc.document_id,
    kc.chunk_index,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity,
    kd.title                               as doc_title,
    kd.source_type                         as doc_source_type
  from knowledge_chunks kc
  join knowledge_documents kd on kd.id = kc.document_id
  where kc.embedding is not null
    and 1 - (kc.embedding <=> query_embedding) >= match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;
