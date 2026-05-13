-- Profile を Prod2 から「取り込み先 DB」へ足すだけ（上書き・既存行の削除なし）
--
-- 手順:
-- 1) Prod2 の Table Editor で "Profile" を CSV エクスポートする。
-- 2) 取り込み先（例: EduMatchPJ）で本ファイルの CREATE TABLE まで実行する（または既にあるならスキップ）。
-- 3) 取り込み先で public._staging_profile_import_prod2 に、同じカラム構成の CSV をインポートする
--    （Supabase の Import、または SQL の COPY）。
-- 4) このファイルの INSERT ブロックを実行する。
-- 5) 問題なければ DROP TABLE public._staging_profile_import_prod2; でステージングを捨てる。
--
-- 挙動:
-- - 取り込み先に既にいる id はスキップ（ON CONFLICT (id) DO NOTHING）。
-- - 取り込み先に同じ email の別ユーザーがいる行もスキップ（上書きしないため）。
-- - stripe_customer_id が取り込み先で既に使われている行もスキップ（ユニーク衝突回避）。
-- - 既存行の UPDATE / DELETE / TRUNCATE("Profile") は一切しない。

CREATE TABLE IF NOT EXISTS public._staging_profile_import_prod2 (
  id UUID NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  subscription_status TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL,
  phone TEXT,
  bio TEXT,
  website TEXT,
  subscription_plan TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_current_period_end TIMESTAMP(3),
  chat_usage_events JSONB,
  ai_navigator_agreed_at TIMESTAMP(3),
  interests TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  interest_other TEXT,
  manual_profile_kind TEXT,
  onboarding_completed_at TIMESTAMP(3),
  ai_kentei_passed BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO public."Profile" (
  id,
  role,
  name,
  email,
  avatar_url,
  subscription_status,
  created_at,
  updated_at,
  phone,
  bio,
  website,
  subscription_plan,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_current_period_end,
  chat_usage_events,
  ai_navigator_agreed_at,
  interests,
  interest_other,
  manual_profile_kind,
  onboarding_completed_at,
  ai_kentei_passed
)
SELECT
  s.id,
  s.role::"Role",
  s.name,
  s.email,
  s.avatar_url,
  s.subscription_status,
  s.created_at,
  s.updated_at,
  s.phone,
  s.bio,
  s.website,
  s.subscription_plan,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.subscription_current_period_end,
  s.chat_usage_events,
  s.ai_navigator_agreed_at,
  COALESCE(s.interests, '{}'::TEXT[]),
  s.interest_other,
  s.manual_profile_kind,
  s.onboarding_completed_at,
  COALESCE(s.ai_kentei_passed, FALSE)
FROM public._staging_profile_import_prod2 s
WHERE NOT EXISTS (SELECT 1 FROM public."Profile" p WHERE p.id = s.id)
  AND NOT EXISTS (
    SELECT 1 FROM public."Profile" p
    WHERE lower(btrim(p.email)) = lower(btrim(s.email))
  )
  AND (
    s.stripe_customer_id IS NULL
    OR btrim(s.stripe_customer_id) = ''
    OR NOT EXISTS (
      SELECT 1 FROM public."Profile" p
      WHERE p.stripe_customer_id IS NOT NULL
        AND p.stripe_customer_id = s.stripe_customer_id
    )
  )
ON CONFLICT (id) DO NOTHING;

-- ステージングを消す（任意。中身を消したいだけなら TRUNCATE はステージング専用なので可）
-- DROP TABLE IF EXISTS public._staging_profile_import_prod2;
