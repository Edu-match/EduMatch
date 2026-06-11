-- ご意見ボックス：ブース来場者の声を集める専用カテゴリ＋サブカテゴリ。
-- トップ常設ボタンからの投稿先（既存の interop_posts / /api/interop/posts を流用）。
-- 再実行しても安全（slug 一意制約 + ON CONFLICT DO NOTHING）。

INSERT INTO interop_categories (name, slug, description, color, is_primary, sort_order)
VALUES ('ご意見ボックス', 'opinion-box', 'ブース来場者の声・ご意見', '#FBC9D4', false, 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO interop_sub_categories (category_id, name, slug, description, sort_order)
SELECT c.id, 'みんなの声', 'opinion-box-voices', '教育AIサミットの感想・ご意見をお寄せください', 0
FROM interop_categories c
WHERE c.slug = 'opinion-box'
ON CONFLICT (slug) DO NOTHING;
