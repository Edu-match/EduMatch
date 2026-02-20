-- サービスカテゴリの新リスト（旧カテゴリから新カテゴリへ）
-- 既存データの category を新カテゴリにマッピング
UPDATE "Service" SET category = 'AI活用' WHERE category IN ('AI学習', 'AI');
UPDATE "Service" SET category = '問題演習' WHERE category IN ('教材作成', '問題集');
UPDATE "Service" SET category = '生徒管理' WHERE category IN ('授業管理', '塾管理');
UPDATE "Service" SET category = '保護者連絡' WHERE category = 'コミュニケーション';
UPDATE "Service" SET category = 'その他管理/代行' WHERE category IN ('その他', '');
