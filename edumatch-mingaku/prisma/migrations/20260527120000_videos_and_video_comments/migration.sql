-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "youtube_url" TEXT NOT NULL,
    "youtube_id" TEXT NOT NULL,
    "ai_summary" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "author_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_comments" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "author_id" UUID,
    "author_name" TEXT NOT NULL,
    "author_role" TEXT NOT NULL DEFAULT '一般',
    "body" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "videos_is_published_created_at_idx" ON "videos"("is_published", "created_at" DESC);

-- CreateIndex
CREATE INDEX "video_comments_video_id_created_at_idx" ON "video_comments"("video_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "video_comments_parent_id_idx" ON "video_comments"("parent_id");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "video_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
