-- 井戸端: AI週次お題・お題履歴・投稿の紐づけ
CREATE TABLE IF NOT EXISTS forum_room_topics (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES forum_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forum_room_topics_room_period_idx
  ON forum_room_topics (room_id, period_start DESC);

ALTER TABLE forum_rooms
  ADD COLUMN IF NOT EXISTS ai_weekly_topic_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS topic_id TEXT REFERENCES forum_room_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS forum_posts_topic_id_idx ON forum_posts(topic_id);

-- 人材マッチング: ギャラ（料金目安）
ALTER TABLE "GeneralProfile"
  ADD COLUMN IF NOT EXISTS talent_hourly_rate TEXT;

ALTER TABLE "CorporateProfile"
  ADD COLUMN IF NOT EXISTS talent_hourly_rate TEXT;
