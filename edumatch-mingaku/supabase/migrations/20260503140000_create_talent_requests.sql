-- 人材マッチング依頼（API /api/talent/[id]/request が使用）
-- 旧 sql/mtg_additions.sql では id が TEXT だったため、アプリ（Prisma）と不整合になる場合は削除して作り直す
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_requests'
      AND column_name = 'id'
      AND data_type = 'text'
  ) THEN
    DROP TABLE public.talent_requests CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS talent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES "Profile"(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES "Profile"(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  requester_org TEXT,
  request_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_talent_requests_talent_id ON talent_requests(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_requests_created_at ON talent_requests(created_at DESC);
