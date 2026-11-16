-- Additive only; no existing user, blog or session data is changed.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket_key CHAR(64) PRIMARY KEY,
  attempts INTEGER NOT NULL CHECK (attempts >= 0),
  reset_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_reset ON auth_rate_limits (reset_at);
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE auth_rate_limits FROM PUBLIC;
DO $$
DECLARE browser_role TEXT;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE auth_rate_limits FROM %I', browser_role);
    END IF;
  END LOOP;
END $$;
