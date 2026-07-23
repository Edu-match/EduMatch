-- 同一ユーザーの同一コンテンツへの有効な申込を1件に制限する部分ユニークインデックス。
-- キャンセル済み(status='cancelled')は対象外なので、キャンセル→再申込は可能。
-- 未ログイン申込(profile_id IS NULL)は対象外（NULL同士は衝突しない設計を明示）。
CREATE UNIQUE INDEX IF NOT EXISTS kaikan_applications_content_profile_active_key
ON kaikan_applications (content_id, profile_id)
WHERE status <> 'cancelled' AND profile_id IS NOT NULL;
