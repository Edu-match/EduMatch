CREATE TABLE IF NOT EXISTS text_overrides (
  id TEXT NOT NULL,
  pathname TEXT NOT NULL,
  text_key TEXT NOT NULL,
  original TEXT NOT NULL,
  override TEXT NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  CONSTRAINT text_overrides_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS text_overrides_pathname_text_key_key ON text_overrides(pathname, text_key);
CREATE INDEX IF NOT EXISTS text_overrides_pathname_idx ON text_overrides(pathname);
