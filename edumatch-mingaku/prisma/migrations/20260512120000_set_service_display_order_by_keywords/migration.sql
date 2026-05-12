-- サービス名に含まれるキーワードで表示順を付与（小さいほど先）
-- 上から: ワンリード → ZEP → … → 塾シル。該当しない行は 999。
-- CASE は上から評価されるため、複数キーワードに当てはまる場合は先に書いた条件が優先される。
UPDATE "Service"
SET "display_order" = CASE
  WHEN "title" ILIKE '%ワンリード%' THEN 0
  WHEN "title" ILIKE '%ZEP%' THEN 1
  WHEN "title" ILIKE '%システムASSIST%' THEN 2
  WHEN ("title" ILIKE '%KAWASEMI%' AND "title" ILIKE '%Lite%') OR "title" ILIKE '%KAWASEMI Lite%' THEN 3
  WHEN "title" ILIKE '%V-Growth%' THEN 4
  WHEN "title" ILIKE '%TERRACE%' THEN 5
  WHEN "title" ILIKE '%aim@%' THEN 6
  WHEN "title" ILIKE '%塾シル%' THEN 7
  ELSE 999
END;
