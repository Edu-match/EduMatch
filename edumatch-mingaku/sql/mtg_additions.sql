-- ==========================================================
-- MTG追加機能の手動マイグレーション SQL
-- 実行場所: Supabase SQL Editor
-- ==========================================================

-- 1. GeneralProfile: 依頼種別バッジ（講演/講師/仕事）
ALTER TABLE "GeneralProfile"
  ADD COLUMN IF NOT EXISTS talent_badges TEXT[] DEFAULT '{}';

-- 2. CorporateProfile: 依頼種別バッジ
ALTER TABLE "CorporateProfile"
  ADD COLUMN IF NOT EXISTS talent_badges TEXT[] DEFAULT '{}';

-- 3. (既存データ確認) talent_matching_enabled が既に追加済みのはずだが念のため
ALTER TABLE "GeneralProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE "GeneralProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_description TEXT;

ALTER TABLE "CorporateProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE "CorporateProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_description TEXT;

-- 4. Profile: AI検定合格フラグ（人材マッチングバッジ表示用）
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS ai_kentei_passed BOOLEAN DEFAULT FALSE;

-- 5. ForumRoomConnection: 管理者シナプス管理テーブル（将来拡張用）
CREATE TABLE IF NOT EXISTS "ForumRoomConnection" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  from_room   TEXT NOT NULL,
  to_room     TEXT NOT NULL,
  created_by  UUID REFERENCES "Profile"(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_room, to_room)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_forum_room_connection_from ON "ForumRoomConnection"(from_room);
CREATE INDEX IF NOT EXISTS idx_forum_room_connection_to ON "ForumRoomConnection"(to_room);

-- 6. ForumRoom: 非表示フラグ
ALTER TABLE "forum_rooms"
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 7. 人材マッチング依頼テーブル
CREATE TABLE IF NOT EXISTS talent_requests (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  talent_id            UUID NOT NULL REFERENCES "Profile"(id) ON DELETE CASCADE,
  requester_id         UUID REFERENCES "Profile"(id) ON DELETE SET NULL,
  requester_name       TEXT NOT NULL,
  requester_email      TEXT NOT NULL,
  requester_phone      TEXT,
  requester_org        TEXT,
  request_type         TEXT NOT NULL,
  message              TEXT NOT NULL,
  status               TEXT DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_talent_requests_talent_id ON talent_requests(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_requests_created_at ON talent_requests(created_at DESC);
