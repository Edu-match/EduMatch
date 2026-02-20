-- サービスの WooCommerce product (post) ID。XML とのマッチ・提供者名の復元用
ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "wp_product_id" INT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Service_wp_product_id_key"
  ON public."Service" ("wp_product_id") WHERE "wp_product_id" IS NOT NULL;

COMMENT ON COLUMN public."Service"."wp_product_id" IS 'WooCommerce product (post) ID。XML とのマッチ・再インポート用';
