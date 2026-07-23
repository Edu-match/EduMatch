ALTER TABLE "kaikan_contents" ADD COLUMN IF NOT EXISTS "content_type" TEXT NOT NULL DEFAULT 'session';
