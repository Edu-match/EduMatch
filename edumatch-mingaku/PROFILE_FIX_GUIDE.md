# Profileテーブル作成問題の修正ガイド

## 問題の概要

新規ユーザー登録時にSupabase Auth（`auth.users`テーブル）にはユーザーが作成されるが、アプリケーションの`Profile`テーブルにレコードが作成されない問題が発生していました。

## 修正内容

### 1. Supabaseトリガーの設定（推奨）

新規ユーザーが`auth.users`に作成されたときに、自動的に`Profile`テーブルにレコードを作成するトリガーを設定します。

#### 実行方法

**方法A: Supabaseダッシュボードから実行（最も簡単）**

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 以下のSQLを実行：

```sql
-- トリガー関数を作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."Profile" (
    id,
    name,
    email,
    role,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public."Role",
      'VIEWER'::public."Role"
    ),
    'INACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- トリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- emailのユニーク制約を追加（Prismaで既に設定済みの場合はスキップされる）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Profile_email_key') THEN
    ALTER TABLE public."Profile" ADD CONSTRAINT "Profile_email_key" UNIQUE (email);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

5. 「Run」ボタンをクリック
6. 成功メッセージを確認

**方法B: プロジェクトのマイグレーションファイルを使用**

```bash
cd edumatch-mingaku

# マイグレーションファイルの内容をSupabaseで実行
# ファイル: supabase/migrations/20260126_create_profile_trigger.sql
```

### 2. 既存ユーザーのProfile修正

トリガー設定前に作成されたユーザーのProfileレコードを一括作成します。

#### 実行方法

**方法A: Node.jsスクリプトを実行（推奨）**

```bash
cd edumatch-mingaku

# 既存ユーザーのProfile不整合を修正
npm run fix:profiles
```

このスクリプトは以下を実行します：
- Auth.usersの全ユーザーを取得
- Profileテーブルと照合
- 不足しているProfileレコードを自動作成
- 実行結果をコンソールに表示

**方法B: SupabaseダッシュボードからSQLを実行**

```sql
-- 不足しているProfileレコードを一括作成
INSERT INTO public."Profile" (
  id,
  name,
  email,
  role,
  subscription_status,
  created_at,
  updated_at
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name,
  u.email,
  COALESCE(
    (u.raw_user_meta_data->>'role')::public."Role",
    'VIEWER'::public."Role"
  ) as role,
  'INACTIVE' as subscription_status,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN public."Profile" p ON u.id = p.id
WHERE p.id IS NULL;
```

### 3. API側の改善

`/api/auth/signup`のエラーハンドリングを改善し、重複作成を防ぐために`upsert`を使用するように変更しました。

## 動作確認

### トリガーが正しく設定されているか確認

```sql
-- SQL Editorで実行
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

期待される結果：
```
trigger_name          | event_manipulation | event_object_table
----------------------|-------------------|-------------------
on_auth_user_created  | INSERT            | users
```

### すべてのユーザーにProfileが存在するか確認

```sql
-- Auth.usersにあるがProfileにないユーザーを検索
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'name' as name
FROM auth.users u
LEFT JOIN public."Profile" p ON u.id = p.id
WHERE p.id IS NULL;
```

結果が0件であれば、すべてのユーザーにProfileが存在します。

### 新規ユーザー登録をテスト

1. ログアウトする
2. 新規登録ページにアクセス
3. テストユーザーを作成
4. 以下のSQLで確認：

```sql
-- 最新のユーザーのProfile確認
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  u.email_confirmed_at,
  p.created_at
FROM public."Profile" p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 5;
```

## トラブルシューティング

### エラー: 「関数が既に存在します」

```sql
-- 既存の関数を削除してから再作成
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

その後、トリガー設定のSQLを再実行してください。

### エラー: 「Permission denied」

管理者権限（SECURITY DEFINER）が必要です。Supabaseダッシュボードから実行してください。

### Profileは作成されるが、roleがVIEWERになってしまう

サインアップ時に`raw_user_meta_data`に`role`を正しく設定しているか確認：

```typescript
// signup API (正しい実装)
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name,
      role: userType === "provider" ? "PROVIDER" : "VIEWER",
    },
  },
});
```

### 既存ユーザーのroleを変更したい

```sql
-- 特定ユーザーのroleを変更
UPDATE public."Profile"
SET role = 'PROVIDER'
WHERE email = 'user@example.com';

-- Auth.usersのメタデータも更新（オプション）
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"PROVIDER"'
)
WHERE email = 'user@example.com';
```

## まとめ

1. **トリガー設定** - 今後の新規ユーザーは自動的にProfileが作成される
2. **既存データ修正** - 過去のユーザーのProfileを一括作成
3. **API改善** - 重複エラーを防ぎ、エラーログを改善

これらの対応により、新規ユーザー登録時のProfile作成問題が解決されます。
