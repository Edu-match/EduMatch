-- CreateTable
CREATE TABLE "ArticleTag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTag_name_key" ON "ArticleTag"("name");

-- CreateIndex (partial: 非NULLのslugのみユニーク。NULLは複数可)
CREATE UNIQUE INDEX "ArticleTag_slug_key" ON "ArticleTag"("slug") WHERE "slug" IS NOT NULL;

-- CreateIndex
CREATE INDEX "ArticleTag_sort_order_idx" ON "ArticleTag"("sort_order");

-- CreateIndex
CREATE INDEX "ArticleTag_name_idx" ON "ArticleTag"("name");
