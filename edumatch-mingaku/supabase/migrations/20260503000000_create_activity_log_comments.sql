-- Activity log comments: allows users to comment on activity log entries
CREATE TABLE IF NOT EXISTS "ActivityLogComment" (
  "id"          TEXT        NOT NULL,
  "log_id"      TEXT        NOT NULL,
  "author_id"   UUID,
  "author_name" TEXT        NOT NULL,
  "body"        TEXT        NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY ("id"),
  FOREIGN KEY ("log_id")    REFERENCES "ActivityLog"("id") ON DELETE CASCADE,
  FOREIGN KEY ("author_id") REFERENCES "Profile"("id")     ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ActivityLogComment_log_id_idx"
  ON "ActivityLogComment" ("log_id");

CREATE INDEX IF NOT EXISTS "ActivityLogComment_created_at_idx"
  ON "ActivityLogComment" ("created_at" DESC);
