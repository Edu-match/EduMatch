# Supabaseマイグレーション

## 新規ユーザー作成時のProfile自動作成トリガー

新しいユーザーがSupabase Authに登録されたときに、自動的に`Profile`テーブルにレコードを作成するトリガーを設定します。

### 方法1: Supabaseダッシュボードから実行（推奨）

1. Supabaseプロジェクトのダッシュボードにアクセス
2. 左メニューから「SQL Editor」を選択
3. 「New query」をクリック
4. `migrations/20260126_create_profile_trigger.sql`の内容をコピー&ペースト
5. 「Run」ボタンをクリックして実行

### 方法2: Supabase CLIを使用

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# プロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref <your-project-ref>

# マイグレーションを実行
supabase db push
```

### 方法3: Prisma Migrateを使用

```bash
cd edumatch-mingaku

# マイグレーションファイルを作成
npx prisma migrate dev --name add_profile_trigger

# 本番環境にデプロイ
npx prisma migrate deploy
```

## トリガーの動作確認

トリガーが正しく設定されているか確認：

```sql
-- SQL Editorで実行
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

期待される結果：
- trigger_name: `on_auth_user_created`
- event_manipulation: `INSERT`
- event_object_table: `users`
- action_statement: `EXECUTE FUNCTION public.handle_new_user()`

## トラブルシューティング

### 既存ユーザーのProfile作成

トリガー設定前に作成されたユーザーのProfileレコードを一括作成：

```sql
-- SQL Editorで実行
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

### Profileレコードの確認

```sql
-- 全Profileレコードを確認
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  p.subscription_status,
  u.email as auth_email,
  u.email_confirmed_at
FROM public."Profile" p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
```

### Auth.usersとProfileの不整合を確認

```sql
-- Auth.usersにあるがProfileにないユーザー
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data
FROM auth.users u
LEFT JOIN public."Profile" p ON u.id = p.id
WHERE p.id IS NULL;
```

## 注意事項

- トリガーは`AFTER INSERT`イベントで動作するため、ユーザー作成後に実行されます
- `ON CONFLICT (id) DO NOTHING`により、重複レコード作成は回避されます
- APIコードでも`upsert`を使用しているため、二重作成は発生しません
- Profileテーブルの`email`カラムにはUNIQUE制約が追加されます
