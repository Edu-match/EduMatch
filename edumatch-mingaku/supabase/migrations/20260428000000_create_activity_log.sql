-- Activity log table for admin audit trail (Git-like history)
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id"           TEXT        NOT NULL,
  "actor_id"     UUID,
  "actor_name"   TEXT        NOT NULL,
  "action"       TEXT        NOT NULL,
  "target_type"  TEXT        NOT NULL,
  "target_id"    TEXT        NOT NULL,
  "target_title" TEXT        NOT NULL,
  "detail"       TEXT,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY ("id"),
  FOREIGN KEY ("actor_id") REFERENCES "Profile"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "activity_log_created_at_idx"
  ON "ActivityLog" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "activity_log_actor_id_idx"
  ON "ActivityLog" ("actor_id");

CREATE INDEX IF NOT EXISTS "activity_log_target_idx"
  ON "ActivityLog" ("target_type", "target_id");
