-- 表示順を指定のとおりに設定（Supabase SQL Editor で実行）
-- プレミアム / スタンダード / ベーシック / その他 / なし のラベルで設定

-- 1. いったんすべて「なし」に（基本値）
UPDATE "Service" SET sort_order = 'なし';

-- 2. プレミアム: 合同会社CROP ワンリード
UPDATE "Service" SET sort_order = 'プレミアム'
WHERE title ILIKE '%ワンリード%'
   OR "provider_display_name" ILIKE '%ワンリード%'
   OR "provider_display_name" ILIKE '%CROP%'
   OR provider_id IN (SELECT id FROM "Profile" WHERE name ILIKE '%CROP%' OR name ILIKE '%ワンリード%');

-- 3. スタンダード: 青山英語学院 システムASSIST, 英俊社 KAWASEMI Lite, V-Growth, SRJ TERRACE
UPDATE "Service" SET sort_order = 'スタンダード'
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
UPDATE "Service" SET sort_order = 'ベーシック'
WHERE title ILIKE '%aim@%' OR title ILIKE '%エイムアット%'
   OR title ILIKE '%Dr.okke%' OR title ILIKE '%okke%'
   OR title ILIKE '%塾シル%'
   OR "provider_display_name" ILIKE '%aim@%' OR "provider_display_name" ILIKE '%メイツ%'
   OR "provider_display_name" ILIKE '%okke%' OR "provider_display_name" ILIKE '%Dr.okke%'
   OR "provider_display_name" ILIKE '%塾シル%' OR "provider_display_name" ILIKE '%ユナイトプロジェクト%'
   OR provider_id IN (SELECT id FROM "Profile" WHERE name ILIKE '%メイツ%' OR name ILIKE '%okke%' OR name ILIKE '%ユナイトプロジェクト%');

-- 5. その他: Lacicu 受験コンパス・Liew, Kidsプログラミングラボ, コードキャンプ CodeCampKIDS, スリーピース
UPDATE "Service" SET sort_order = 'その他'
WHERE title ILIKE '%受験コンパス%' OR title ILIKE '%Liew%' OR title ILIKE '%リュウ%'
   OR title ILIKE '%Kidsプログラミング%' OR title ILIKE '%キッズプログラミング%'
   OR title ILIKE '%CodeCampKIDS%' OR title ILIKE '%コードキャンプ%'
   OR title ILIKE '%スリーピース%' OR title ILIKE '%まならぶる%'
   OR "provider_display_name" ILIKE '%Lacicu%' OR "provider_display_name" ILIKE '%受験コンパス%'
   OR "provider_display_name" ILIKE '%Kidsプログラミング%' OR "provider_display_name" ILIKE '%コードキャンプ%'
   OR "provider_display_name" ILIKE '%スリーピース%'
   OR provider_id IN (SELECT id FROM "Profile" WHERE name ILIKE '%Lacicu%' OR name ILIKE '%コードキャンプ%' OR name ILIKE '%スリーピース%');

-- なし: 上記以外は 1. のまま
