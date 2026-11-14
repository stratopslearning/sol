-- sol_knowledge_version_by_id was created as sol_migrator (no BYPASSRLS).
-- Under FORCE RLS, SECURITY DEFINER as that role still sees 0 rows without
-- app.tenant_id. Re-own to the BYPASSRLS table owner (same as other knowledge
-- document read definers in 0060).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'sol_knowledge_version_by_id'
  ) AND EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner'
  ) THEN
    ALTER FUNCTION sol_knowledge_version_by_id(uuid) OWNER TO neondb_owner;
  END IF;
END
$$;
