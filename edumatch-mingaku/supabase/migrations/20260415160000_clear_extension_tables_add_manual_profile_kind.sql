-- =============================================================================
-- 1) GeneralProfile / CorporateProfile を空にする
-- 2) Profile に手動分類用カラムを追加（Table Editor で general / corporate を選べる）
-- =============================================================================
-- Supabase: Column の Enum または Check で UI を整えるとプルドロップダウンになりやすいです。
-- 実行後、各行の manual_profile_kind を設定してから
-- 20260415170000_apply_manual_profile_kind_to_extension.sql を実行してください。
-- =============================================================================

BEGIN;

DELETE FROM public."GeneralProfile";
DELETE FROM public."CorporateProfile";

ALTER TABLE public."Profile"
  ADD COLUMN IF NOT EXISTS "manual_profile_kind" TEXT;

COMMENT ON COLUMN public."Profile"."manual_profile_kind" IS
  '手動分類: general=一般ユーザー(GeneralProfile), corporate=企業ユーザー(CorporateProfile)。NULL=未設定。';

ALTER TABLE public."Profile" DROP CONSTRAINT IF EXISTS "Profile_manual_profile_kind_check";

ALTER TABLE public."Profile"
  ADD CONSTRAINT "Profile_manual_profile_kind_check"
  CHECK (
    "manual_profile_kind" IS NULL
    OR "manual_profile_kind" IN ('general', 'corporate')
  );

COMMIT;
