-- 初回オンボーディング完了日時・所属「その他」補足
ALTER TABLE public."Profile"
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMPTZ;

ALTER TABLE public."GeneralProfile"
  ADD COLUMN IF NOT EXISTS "organization_type_other" TEXT;

ALTER TABLE public."CorporateProfile"
  ADD COLUMN IF NOT EXISTS "organization_type_other" TEXT;

-- 既存ユーザーは初回設定済みとみなす（Google ですべてスキップされないようにするための新規のみ null）
UPDATE public."Profile"
SET "onboarding_completed_at" = COALESCE("onboarding_completed_at", "updated_at")
WHERE "onboarding_completed_at" IS NULL;
