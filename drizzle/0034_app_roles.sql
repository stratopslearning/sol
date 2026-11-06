-- Phase B: least-privilege Neon roles (dev rehearsal).
-- Run as the project owner role (neondb_owner). Neon rejects ALTER ROLE that
-- toggles SUPERUSER; CREATE ROLE defaults are already non-superuser.
-- See also scripts/sql/create-app-role.sql.
--
-- Replace passwords before applying, or use scripts that substitute them.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    CREATE ROLE sol_app LOGIN PASSWORD 'CHANGE_ME_APP_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_migrator') THEN
    CREATE ROLE sol_migrator LOGIN PASSWORD 'CHANGE_ME_MIGRATE_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- NOBYPASSRLS is the default for new roles on Postgres 15+; set explicitly when allowed.
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER ROLE sol_app NOBYPASSRLS';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Could not ALTER ROLE sol_app NOBYPASSRLS (Neon may disallow); default should still be no bypass';
    WHEN undefined_object THEN
      NULL;
  END;
END
$$;

GRANT CONNECT ON DATABASE neondb TO sol_app;
GRANT CONNECT ON DATABASE neondb TO sol_migrator;

GRANT USAGE ON SCHEMA public TO sol_app;
GRANT USAGE ON SCHEMA public TO sol_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sol_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sol_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sol_app;

GRANT CREATE ON SCHEMA public TO sol_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sol_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sol_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO sol_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO sol_migrator;
