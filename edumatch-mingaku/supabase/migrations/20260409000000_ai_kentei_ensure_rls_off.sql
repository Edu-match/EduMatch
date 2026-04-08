-- Table Editor や手動操作で RLS が有効化されている場合、anon 経由の読み取りが空になる。
-- アプリの API はサービスロールでアクセスする想定だが、開発時の一貫性のため RLS を無効のままにする。
ALTER TABLE IF EXISTS ai_kentei_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_kentei_exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_kentei_certificates DISABLE ROW LEVEL SECURITY;
