/*
  Warnings:

  - You are about to drop the `AdvancedChatUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArticleTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatUsageDaily` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatUsageWeekly` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "HomeNewsTab" AS ENUM ('NONE', 'DOMESTIC', 'INTERNATIONAL', 'WEEKLY');

-- DropForeignKey
ALTER TABLE "AdvancedChatUsage" DROP CONSTRAINT "AdvancedChatUsage_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ChatUsage" DROP CONSTRAINT "ChatUsage_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ChatUsageDaily" DROP CONSTRAINT "ChatUsageDaily_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ChatUsageWeekly" DROP CONSTRAINT "ChatUsageWeekly_user_id_fkey";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "author_display_name" TEXT,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT '教育ICT',
ADD COLUMN     "favorite_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "home_news_tab" "HomeNewsTab" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "wp_post_id" INTEGER;

-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "chat_usage_events" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "favorite_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provider_display_name" TEXT,
ADD COLUMN     "request_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 9999,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wp_product_id" INTEGER;

-- DropTable
DROP TABLE "AdvancedChatUsage";

-- DropTable
DROP TABLE "ArticleTag";

-- DropTable
DROP TABLE "ChatUsage";

-- DropTable
DROP TABLE "ChatUsageDaily";

-- DropTable
DROP TABLE "ChatUsageWeekly";

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'fast',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "user_id" UUID,
    "author_name" TEXT NOT NULL,
    "rating" INTEGER,
    "body" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "wp_comment_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteUpdate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT,
    "published_at" TIMESTAMPTZ(6) NOT NULL,
    "link" TEXT,
    "wp_post_id" INTEGER,
    "thumbnail_url" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSliderArticle" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "post_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeSliderArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeminarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "event_date" TEXT,
    "venue" TEXT,
    "company" TEXT,
    "external_url" TEXT,
    "wp_post_id" INTEGER,
    "wp_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeminarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSession_user_id_idx" ON "ChatSession"("user_id");

-- CreateIndex
CREATE INDEX "ChatSession_user_id_created_at_idx" ON "ChatSession"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Review_service_id_idx" ON "Review"("service_id");

-- CreateIndex
CREATE INDEX "Review_user_id_idx" ON "Review"("user_id");

-- CreateIndex
CREATE INDEX "Review_created_at_idx" ON "Review"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteUpdate_wp_post_id_key" ON "SiteUpdate"("wp_post_id");

-- CreateIndex
CREATE INDEX "SiteUpdate_published_at_idx" ON "SiteUpdate"("published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "HomeSliderArticle_post_id_key" ON "HomeSliderArticle"("post_id");

-- CreateIndex
CREATE INDEX "HomeSliderArticle_position_idx" ON "HomeSliderArticle"("position");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategory_name_key" ON "ArticleCategory"("name");

-- CreateIndex
CREATE INDEX "ArticleCategory_sort_order_idx" ON "ArticleCategory"("sort_order");

-- CreateIndex
CREATE INDEX "ArticleCategory_name_idx" ON "ArticleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SeminarEvent_wp_post_id_key" ON "SeminarEvent"("wp_post_id");

-- CreateIndex
CREATE INDEX "SeminarEvent_event_date_idx" ON "SeminarEvent"("event_date");

-- CreateIndex
CREATE INDEX "SeminarEvent_wp_post_id_idx" ON "SeminarEvent"("wp_post_id");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE INDEX "Post_favorite_count_idx" ON "Post"("favorite_count");

-- CreateIndex
CREATE INDEX "Service_favorite_count_idx" ON "Service"("favorite_count");

-- CreateIndex
CREATE INDEX "Service_request_count_idx" ON "Service"("request_count");

-- CreateIndex
CREATE INDEX "Service_review_count_idx" ON "Service"("review_count");

-- CreateIndex
CREATE INDEX "service_sort_order_idx" ON "Service"("sort_order", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "HomeSliderArticle" ADD CONSTRAINT "HomeSliderArticle_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
