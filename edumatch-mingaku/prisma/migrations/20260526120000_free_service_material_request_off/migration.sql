-- 無料サービス（sort_order = なし）は資料請求ボタンを常にオフ

UPDATE "Service"
SET "show_material_request_button" = FALSE
WHERE sort_order::text = 'なし'
  AND "show_material_request_button" IS DISTINCT FROM FALSE;

CREATE OR REPLACE FUNCTION sync_free_service_material_request_button()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sort_order::text = 'なし' THEN
    NEW.show_material_request_button := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_free_material_request_off ON "Service";
CREATE TRIGGER trg_service_free_material_request_off
  BEFORE INSERT OR UPDATE ON "Service"
  FOR EACH ROW
  EXECUTE FUNCTION sync_free_service_material_request_button();
