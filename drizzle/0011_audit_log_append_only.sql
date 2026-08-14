-- WORM-lite: audit_log is append-only. The app uses a single DATABASE_URL
-- role (REVOKE UPDATE/DELETE would also block migrations), so a trigger
-- rejects mutations instead.
CREATE OR REPLACE FUNCTION audit_log_forbid_mutate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_forbid_update ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_forbid_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_forbid_mutate();
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_forbid_delete ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_forbid_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_forbid_mutate();
