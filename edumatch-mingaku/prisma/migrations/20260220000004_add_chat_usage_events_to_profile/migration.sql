-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "chat_usage_events" JSONB DEFAULT '[]';
