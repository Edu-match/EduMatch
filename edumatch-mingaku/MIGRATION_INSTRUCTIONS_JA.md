# AI検定 セットアップ - Supabaseマイグレーション実行方法

## 問題: "セッションが見つかりません" エラー

**原因**: Supabaseデータベースに AI検定 テーブルが作成されていません

## 解決方法

### ステップ 1: Supabaseダッシュボードを開く

以下のいずれかの方法でアクセス:
- Supabase公式サイト: https://supabase.com/dashboard
- ブックマークから開く

### ステップ 2: プロジェクトを選択

EduMatch プロジェクトを選択

### ステップ 3: SQL Editor を開く

左メニューから:
```
SQL → SQL Editor
```

### ステップ 4: 新しいクエリを作成

「+ New Query」ボタンをクリック

### ステップ 5: SQLを貼り付け

以下のSQLをコピーして、SQL Editorに貼り付けてください:

```sql
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
```

### ステップ 6: 実行

右上の **「▶ RUN」** ボタン（または Ctrl+Enter）をクリック

✅ 成功メッセージが表示されることを確認

### ステップ 7: テーブルが作成されたか確認

SQL Editorで以下のクエリを実行:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'ai_kentei_%';
```

以下の3つのテーブルが表示されれば成功:
- ai_kentei_questions
- ai_kentei_exam_sessions
- ai_kentei_certificates

### ステップ 8: ブラウザをリロード

```
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows/Linux)
```

### ステップ 9: 再度テスト

1. サイトにアクセス
2. AI検定 → 試験を開始
3. 「問題スキップ」ボタンをクリック
4. ✅ 合格結果画面が表示されるはずです

---

## トラブルシューティング

### Q: SQLを実行したが「テーブルが既に存在します」というエラーが出た
**A**: OK です。`IF NOT EXISTS` があるので、既に存在する場合はスキップされます。

### Q: 実行後も「セッションが見つかりません」と表示される
**A**: 
1. ブラウザのキャッシュをクリア (Cmd+Shift+R)
2. ページを完全にリロード
3. 別のブラウザで試す
4. Supabaseダッシュボールで直接テーブルが作成されたか確認

### Q: SQLがエラーで実行できない
**A**: 
1. SQLをコピーする際、スペースやタブがおかしくなっていないか確認
2. SQLの最後に余分なセミコロンがないか確認
3. 各行が正しくコピーされているか確認
4. 別の場所からコピーして試す

---

## 完了

これで AI検定 の機能がすべて動作するはずです！
