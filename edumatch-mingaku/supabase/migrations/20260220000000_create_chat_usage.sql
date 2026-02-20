-- AIチャットの1日あたりの利用回数（会員限定・1日30回まで）
CREATE TABLE IF NOT EXISTS "ChatUsage" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" UUID NOT NULL REFERENCES "Profile"("id") ON DELETE CASCADE,
  "usage_date" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatUsage_user_id_usage_date_key" ON "ChatUsage"("user_id", "usage_date");
CREATE INDEX IF NOT EXISTS "ChatUsage_user_id_idx" ON "ChatUsage"("user_id");
