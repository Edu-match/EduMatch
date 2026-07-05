-- Review をサービス/記事(Post)の両対応 + 返信スレッド（AI/AIペルソナ/人間）対応に拡張する。
-- 既存行（サービスの口コミ）は service_id 保持のまま影響なし。

-- service_id を任意化（記事レビューでは null）
ALTER TABLE "Review" ALTER COLUMN "service_id" DROP NOT NULL;

-- 記事対象・返信スレッド・立場/AI種別バッジ
ALTER TABLE "Review" ADD COLUMN "post_id" TEXT;
ALTER TABLE "Review" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "Review" ADD COLUMN "author_role" TEXT;

-- 外部キー：記事(Post) / 親レビュー（自己参照スレッド）
ALTER TABLE "Review" ADD CONSTRAINT "Review_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- 索引
CREATE INDEX "Review_post_id_idx" ON "Review"("post_id");
CREATE INDEX "Review_parent_id_idx" ON "Review"("parent_id");
