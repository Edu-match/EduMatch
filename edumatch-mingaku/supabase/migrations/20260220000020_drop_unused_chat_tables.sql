-- 未使用のチャット利用回数テーブルを削除（利用回数は Profile.chat_usage_events で管理）
DROP TABLE IF EXISTS "ChatUsageDaily";
DROP TABLE IF EXISTS "ChatUsageWeekly";
DROP TABLE IF EXISTS "AdvancedChatUsage";
DROP TABLE IF EXISTS "ChatUsage";
