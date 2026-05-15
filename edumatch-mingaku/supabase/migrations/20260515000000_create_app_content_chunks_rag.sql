-- Create app_content_chunks table for full-text RAG indexing
CREATE TABLE IF NOT EXISTS public.app_content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_category TEXT,
  source_type_label TEXT,
  author_id UUID,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_source_table CHECK (
    source_table IN ('service', 'post', 'review', 'forum_post', 'seminar_event', 'site_update')
  ),
  CONSTRAINT unique_chunk UNIQUE (source_table, source_id, chunk_index)
);

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS app_content_chunks_embedding_hnsw_idx
  ON public.app_content_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS app_content_chunks_source_idx
  ON public.app_content_chunks (source_table, source_id, chunk_index);

CREATE INDEX IF NOT EXISTS app_content_chunks_published_idx
  ON public.app_content_chunks (is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS app_content_chunks_author_idx
  ON public.app_content_chunks (author_id)
  WHERE author_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.app_content_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Authenticated users can read published content
CREATE POLICY IF NOT EXISTS authenticated_read_app_content_chunks
  ON public.app_content_chunks
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_published = true
  );

-- RLS Policy 2: Admins can perform all operations
CREATE POLICY IF NOT EXISTS admin_all_app_content_chunks
  ON public.app_content_chunks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- RLS Policy 3: Hide chunks from deleted authors
CREATE POLICY IF NOT EXISTS hide_deleted_authors_app_content
  ON public.app_content_chunks
  FOR SELECT
  USING (
    author_id IS NULL
    OR EXISTS (
      SELECT 1 FROM "Profile" p
      WHERE p.id = author_id AND p.role::text != 'DELETED'
    )
  );

-- Create RPC function for semantic search
CREATE OR REPLACE FUNCTION public.search_app_content_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3,
  limit_source_table TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_table TEXT,
  source_id TEXT,
  source_title TEXT,
  source_category TEXT,
  source_type_label TEXT,
  chunk_index INT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    acc.id,
    acc.source_table,
    acc.source_id,
    acc.source_title,
    acc.source_category,
    acc.source_type_label,
    acc.chunk_index,
    acc.content,
    (1 - (acc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.app_content_chunks acc
  WHERE acc.embedding IS NOT NULL
    AND acc.is_published = true
    AND (limit_source_table IS NULL OR acc.source_table = limit_source_table)
    AND (1 - (acc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY acc.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;

-- Grant permissions on the new function
GRANT EXECUTE ON FUNCTION public.search_app_content_chunks TO authenticated, anon;
