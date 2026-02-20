-- サービスの表示用提供者名。未設定時は provider.name を使用（サービス.csvに提供者列がないため手動または別マッピングで設定）
ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "provider_display_name" TEXT NULL;

COMMENT ON COLUMN public."Service"."provider_display_name" IS '表示用提供者名。未設定時は provider.name を使用';
