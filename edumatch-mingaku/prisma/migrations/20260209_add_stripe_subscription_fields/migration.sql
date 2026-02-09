-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "subscription_plan" TEXT;
ALTER TABLE "Profile" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "Profile" ADD COLUMN "stripe_subscription_id" TEXT;
ALTER TABLE "Profile" ADD COLUMN "subscription_current_period_end" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_stripe_customer_id_key" ON "Profile"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "Profile_stripe_customer_id_idx" ON "Profile"("stripe_customer_id");
