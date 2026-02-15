-- Supabase Auth.usersテーブルに新しいユーザーが作成されたときに
-- 自動的にProfileテーブルにレコードを作成するトリガー

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

-- Profileテーブルのemailにユニーク制約を追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Profile_email_key'
  ) THEN
    ALTER TABLE public."Profile" ADD CONSTRAINT "Profile_email_key" UNIQUE (email);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- 制約が既に存在する場合は何もしない
    NULL;
END $$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auth.usersテーブルに新しいユーザーが作成されたときに、自動的にProfileテーブルにレコードを作成します';
