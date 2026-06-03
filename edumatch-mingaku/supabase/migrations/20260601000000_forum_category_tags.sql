-- 大カテゴリ: 関連エッジ用タグ（各3つ必須）
ALTER TABLE public.forum_categories
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- 既存7カテゴリにタグ投入（slug は seed_forum_categories_from_rooms.sql に準拠）
UPDATE public.forum_categories SET tags = ARRAY['AI', '授業設計', '教育現場']::TEXT[]
  WHERE slug = 'ai-education';

UPDATE public.forum_categories SET tags = ARRAY['教員', '働き方', '教育現場']::TEXT[]
  WHERE slug = 'teacher-work-life';

UPDATE public.forum_categories SET tags = ARRAY['GIGA', 'デジタル化', '端末']::TEXT[]
  WHERE slug = 'giga-digital';

UPDATE public.forum_categories SET tags = ARRAY['多様な学び', '支援', '居場所']::TEXT[]
  WHERE slug = 'diverse-learning';

UPDATE public.forum_categories SET tags = ARRAY['プログラミング', 'STEAM', 'コード']::TEXT[]
  WHERE slug = 'programming-education';

UPDATE public.forum_categories SET tags = ARRAY['政策', '国際', '社会']::TEXT[]
  WHERE slug = 'society-policy';

UPDATE public.forum_categories SET tags = ARRAY['SNS', 'メディアリテラシー', '情報モラル']::TEXT[]
  WHERE slug = 'sns-media-literacy';

-- 空タグの行はプレースホルダ（運営が管理画面で差し替え）
UPDATE public.forum_categories
SET tags = ARRAY['未分類', '未分類', '未分類']::TEXT[]
WHERE cardinality(tags) = 0;

ALTER TABLE public.forum_categories DROP CONSTRAINT IF EXISTS forum_categories_tags_len_check;
ALTER TABLE public.forum_categories
  ADD CONSTRAINT forum_categories_tags_len_check
  CHECK (cardinality(tags) = 3);
