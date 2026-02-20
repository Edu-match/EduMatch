-- AIチャットセッション（履歴保存用）テーブル
CREATE TABLE IF NOT EXISTS "ChatSession" (
  "id"         TEXT NOT NULL,
  "user_id"    UUID NOT NULL,
  "title"      TEXT NOT NULL DEFAULT '',
  "mode"       TEXT NOT NULL DEFAULT 'fast',
  "messages"   JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChatSession_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChatSession_user_id_idx"
  ON "ChatSession"("user_id");

CREATE INDEX IF NOT EXISTS "ChatSession_user_id_created_at_idx"
  ON "ChatSession"("user_id", "created_at" DESC);

-- chat_usage_events カラムを Profile に追加（未存在の場合）
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "chat_usage_events" JSONB DEFAULT '[]';
