-- 全記事を非表示にする（is_published=false, status=DRAFT）
-- Supabase SQL Editor で実行してください
UPDATE "Post"
SET is_published = false, status = 'DRAFT', updated_at = NOW()
WHERE is_published = true OR status = 'APPROVED';
