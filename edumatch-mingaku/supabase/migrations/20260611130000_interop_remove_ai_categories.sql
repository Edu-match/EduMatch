-- 特設（Interop）の展示カテゴリから「AI検定」「AI部」を削除する。
-- interop_sub_categories は interop_categories への FK が ON DELETE CASCADE のため連動削除される。
-- ※ 再実行しても安全（対象が無ければ何も起きない）。

DELETE FROM interop_categories WHERE slug IN ('ai-kentei', 'ai-bu');
