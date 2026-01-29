-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "prefecture" TEXT;

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "service_id" TEXT NOT NULL,
    "use_account_address" BOOLEAN NOT NULL,
    "delivery_name" TEXT NOT NULL,
    "delivery_phone" TEXT,
    "delivery_postal_code" TEXT,
    "delivery_prefecture" TEXT,
    "delivery_city" TEXT,
    "delivery_address" TEXT,
    "delivery_email" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialRequest_user_id_idx" ON "MaterialRequest"("user_id");

-- CreateIndex
CREATE INDEX "MaterialRequest_service_id_idx" ON "MaterialRequest"("service_id");

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
