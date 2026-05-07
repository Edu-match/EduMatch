-- 企業プロフィールの役職・職種（その他自由記述を含む）
ALTER TABLE "CorporateProfile"
ADD COLUMN IF NOT EXISTS "job_title" TEXT;
