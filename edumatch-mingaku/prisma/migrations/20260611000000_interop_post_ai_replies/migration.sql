-- AlterTable: add AI reply support to interop_posts
ALTER TABLE "interop_posts" ADD COLUMN "is_ai_reply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "interop_posts" ADD COLUMN "parent_post_id" UUID;

-- AddForeignKey
ALTER TABLE "interop_posts" ADD CONSTRAINT "interop_posts_parent_post_id_fkey"
  FOREIGN KEY ("parent_post_id") REFERENCES "interop_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "interop_posts_parent_post_id_idx" ON "interop_posts"("parent_post_id");
