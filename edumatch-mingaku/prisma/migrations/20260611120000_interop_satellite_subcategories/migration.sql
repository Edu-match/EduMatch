-- 中心インタロップ直行の3サテライトカテゴリ（最新ニュース／登壇者への質問／ご意見BOX）を
-- 冪等に用意する。既存があれば何もしない（ON CONFLICT DO NOTHING）。破壊的操作なし。
-- 配置先は slug='interop' のカテゴリ。存在しなければ何も挿入されない。

INSERT INTO "interop_sub_categories" (id, category_id, name, slug, description, sort_order, is_active)
SELECT gen_random_uuid(), c.id, '最新ニュース', 'interop-latest-news',
       '運営・登壇者からの最新ニュースとお知らせ。', 1, true
FROM "interop_categories" c
WHERE c.slug = 'interop'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "interop_sub_categories" (id, category_id, name, slug, description, sort_order, is_active)
SELECT gen_random_uuid(), c.id, '登壇者への質問', 'interop-speaker-qa',
       '登壇者・出展者への質問を投稿できます。', 2, true
FROM "interop_categories" c
WHERE c.slug = 'interop'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "interop_sub_categories" (id, category_id, name, slug, description, sort_order, is_active)
SELECT gen_random_uuid(), c.id, 'ご意見BOX', 'interop-opinion-box',
       '教育とAIについて、ご意見・ご感想を自由にどうぞ。', 3, true
FROM "interop_categories" c
WHERE c.slug = 'interop'
ON CONFLICT (slug) DO NOTHING;
