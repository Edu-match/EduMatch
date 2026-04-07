-- AI検定テーブル群
-- EduMatchのデータベースに追加する

-- 問題テーブル
CREATE TABLE IF NOT EXISTS ai_kentei_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number SERIAL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  tag TEXT,
  difficulty TEXT DEFAULT 'medium',
  polarity TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'draft',
  created_by_ai BOOLEAN DEFAULT FALSE,
  reviewed_by_human BOOLEAN DEFAULT FALSE,
  source_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 試験セッションテーブル
CREATE TABLE IF NOT EXISTS ai_kentei_exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  -- ログインユーザーと紐付け（任意）
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  selected_question_ids JSONB NOT NULL DEFAULT '[]',
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  passed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 認定証テーブル
CREATE TABLE IF NOT EXISTS ai_kentei_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id TEXT UNIQUE NOT NULL,
  exam_session_id UUID REFERENCES ai_kentei_exam_sessions(id) ON DELETE CASCADE,
  -- ログインユーザーと紐付け（マイページから確認するため）
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 認定証に表示する名前
  public_display_name TEXT NOT NULL,
  -- 名前の種別: 'display' (表示名) | 'legal' (本名) | 'custom' (手動入力)
  name_type TEXT DEFAULT 'custom',
  photo_url TEXT,
  score INTEGER NOT NULL,
  passed_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT TRUE,
  share_slug TEXT UNIQUE NOT NULL,
  -- メール送信済みフラグ
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS ai_kentei_questions_status_idx ON ai_kentei_questions(status);
CREATE INDEX IF NOT EXISTS ai_kentei_exam_sessions_user_id_idx ON ai_kentei_exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS ai_kentei_certificates_user_id_idx ON ai_kentei_certificates(user_id);
CREATE INDEX IF NOT EXISTS ai_kentei_certificates_share_slug_idx ON ai_kentei_certificates(share_slug);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_ai_kentei_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_kentei_questions_updated_at
  BEFORE UPDATE ON ai_kentei_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_kentei_questions_updated_at();

-- RLS は無効のままにする（サービスロールキーからのアクセスのみ）
ALTER TABLE ai_kentei_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_kentei_exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_kentei_certificates DISABLE ROW LEVEL SECURITY;
