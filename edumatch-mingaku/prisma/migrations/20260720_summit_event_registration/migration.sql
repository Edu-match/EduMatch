-- AddColumn position to GeneralProfile
ALTER TABLE "general_profiles" ADD COLUMN "position" TEXT;

-- CreateTable kaikan_event_responses
CREATE TABLE "kaikan_event_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "consent_agreed" BOOLEAN NOT NULL DEFAULT false,
    "participant_type" TEXT,
    "referrer_name" TEXT,
    "event_discovery_source" TEXT,
    "additional_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "kaikan_event_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kaikan_event_responses_application_id_key" ON "kaikan_event_responses"("application_id");

-- AddForeignKey
ALTER TABLE "kaikan_event_responses" ADD CONSTRAINT "kaikan_event_responses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "kaikan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
