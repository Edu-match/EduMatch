-- 表示順を指定のとおりに設定（Supabase SQL Editor で実行）
-- プレミアム / スタンダード / ベーシック / その他 のラベルで設定

-- 1. いったんすべて「その他」に
UPDATE "Service" SET sort_order = 'その他'::"ServiceDisplayTier";

-- 2. プレミアム: 合同会社CROP ワンリード
UPDATE "Service" SET sort_order = 'プレミアム'::"ServiceDisplayTier"
WHERE title ILIKE '%ワンリード%'
   OR "provider_display_name" ILIKE '%ワンリード%'
   OR "provider_display_name" ILIKE '%CROP%'
   OR provider_id IN (SELECT id FROM "Profile" WHERE name ILIKE '%CROP%' OR name ILIKE '%ワンリード%');

-- 3. スタンダード: 青山英語学院 システムASSIST, 英俊社 KAWASEMI Lite, V-Growth, SRJ TERRACE
UPDATE "Service" SET sort_order = 'スタンダード'::"ServiceDisplayTier"
WHERE title ILIKE '%システムASSIST%' OR title ILIKE '%アシスト%'
   OR title ILIKE '%KAWASEMI%' OR title ILIKE '%カワセミ%'
   OR title ILIKE '%V-Growth%'
   OR title ILIKE '%TERRACE%' OR title ILIKE '%テラス%'
   OR "provider_display_name" ILIKE '%システムASSIST%' OR "provider_display_name" ILIKE '%青山英語学院%'
   OR "provider_display_name" ILIKE '%英俊社%' OR "provider_display_name" ILIKE '%KAWASEMI%'
   OR "provider_display_name" ILIKE '%V-Growth%'
   OR "provider_display_name" ILIKE '%SRJ%' OR "provider_display_name" ILIKE '%TERRACE%'
   OR provider_id IN (SELECT id FROM "Profile" WHERE name ILIKE '%青山英語学院%' OR name ILIKE '%英俊社%' OR name ILIKE '%V-Growth%' OR name ILIKE '%SRJ%');

-- 4. ベーシック: メイツ aim@, okke Dr.okke, ユナイトプロジェクト 塾シル
UPDATE "Service" SET sort_order = 'ベーシック'::"ServiceDisplayTier"
WHERE title ILIKE '%aim@%' OR title ILIKE '%エイムアット%'
   OR title ILIKE '%Dr.okke%' OR title ILIKE '%okke%'
   OR title ILIKE '%塾シル%'
   OR "provider_display_name" ILIKE '%aim@%' OR "provider_display_name" ILIKE '%メイツ%'
   OR "provider_display_name" ILIKE '%okke%' OR "provider_display_name" ILIKE '%Dr.okke%'
   OR "provider_display_name" ILIKE '%塾シル%' OR "provider_display_name" ILIKE '%ユナイトプロジェクト%'
   OR provider_id IN (SELECT id FROM "Profile" WHERE name ILIKE '%メイツ%' OR name ILIKE '%okke%' OR name ILIKE '%ユナイトプロジェクト%');

-- その他: 上記以外は 1. のまま
