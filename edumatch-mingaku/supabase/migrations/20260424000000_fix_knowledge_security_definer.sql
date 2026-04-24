-- =============================================================================
-- match_knowledge_chunks を security definer に変更
-- security invoker だと呼び出しロールによっては RLS やアクセス権の影響を受けるため、
-- 関数オーナー（postgres）の権限で常に実行されるよう変更する。
-- =============================================================================

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
security definer
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

-- 認証済みユーザーと service_role に execute 権限を付与
grant execute on function public.match_knowledge_chunks(vector, int, float)
  to authenticated, service_role, anon;

comment on function public.match_knowledge_chunks is
  'クエリ埋め込みとコサイン類似度でナレッジチャンクを取得（security definer で常に全件アクセス可能）';

notify pgrst, 'reload schema';
