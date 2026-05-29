-- CreateEnum
CREATE TYPE "SponsorPlacement" AS ENUM ('HOME_MAIN', 'HOME_SIDEBAR');

-- CreateTable
CREATE TABLE "sponsor_ads" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT NOT NULL,
    "placement" "SponsorPlacement" NOT NULL DEFAULT 'HOME_MAIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsor_ads_placement_is_active_position_idx" ON "sponsor_ads"("placement", "is_active", "position");
