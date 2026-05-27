-- CreateEnum
CREATE TYPE "VideoVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- AlterTable: add visibility, migrate from is_published, drop is_published
ALTER TABLE "videos" ADD COLUMN "visibility" "VideoVisibility" NOT NULL DEFAULT 'PRIVATE';

UPDATE "videos" SET "visibility" = 'PUBLIC' WHERE "is_published" = true;

DROP INDEX IF EXISTS "videos_is_published_created_at_idx";

ALTER TABLE "videos" DROP COLUMN "is_published";

CREATE INDEX "videos_visibility_created_at_idx" ON "videos"("visibility", "created_at" DESC);
