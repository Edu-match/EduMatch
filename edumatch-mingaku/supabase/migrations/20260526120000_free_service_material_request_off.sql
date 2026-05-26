-- 無料サービス（sort_order = なし）は資料請求ボタンを常にオフにする

-- 既存データを一括修正
UPDATE public."Service"
SET "show_material_request_button" = FALSE
WHERE sort_order::text = 'なし'
  AND "show_material_request_button" IS DISTINCT FROM FALSE;

-- sort_order が「なし」のときは INSERT/UPDATE でも強制オフ
CREATE OR REPLACE FUNCTION public.sync_free_service_material_request_button()
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

DROP TRIGGER IF EXISTS trg_service_free_material_request_off ON public."Service";
CREATE TRIGGER trg_service_free_material_request_off
  BEFORE INSERT OR UPDATE ON public."Service"
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_free_service_material_request_button();

COMMENT ON FUNCTION public.sync_free_service_material_request_button() IS
  'sort_order が「なし」（無料掲載）の Service は show_material_request_button を常に false にする';
