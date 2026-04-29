CREATE TABLE IF NOT EXISTS system_prompt_overrides (
  id TEXT NOT NULL,
  mode TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  CONSTRAINT system_prompt_overrides_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS system_prompt_overrides_mode_key ON system_prompt_overrides(mode);
