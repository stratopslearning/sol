-- Least-privilege Neon roles for SOL.
--
-- Run this once in the Neon SQL Editor as the project owner / neondb_owner.
-- DO NOT run from the app or CI. Replace CHANGE_ME_APP_PASSWORD and
-- CHANGE_ME_MIGRATE_PASSWORD before executing.
--
-- After creating roles:
--   1. Build a pooled connection string for sol_app → Vercel DATABASE_URL
--   2. Build a (pooled or direct) connection string for sol_migrator →
--      Vercel / CI DATABASE_MIGRATE_URL (migrations + drizzle-kit only)
--   3. Smoke-test login, quiz submit, and `npm run migrate` with the migrator URL

BEGIN;

-- Application runtime role: DML only (no DDL).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    CREATE ROLE sol_app LOGIN PASSWORD 'CHANGE_ME_APP_PASSWORD';
  END IF;
END
$$;

-- Migration role: used only by drizzle-kit / CI migrate jobs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_migrator') THEN
    CREATE ROLE sol_migrator LOGIN PASSWORD 'CHANGE_ME_MIGRATE_PASSWORD';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE neondb TO sol_app;
GRANT CONNECT ON DATABASE neondb TO sol_migrator;
-- Replace `neondb` above if your Neon database name differs.

GRANT USAGE ON SCHEMA public TO sol_app;
GRANT USAGE ON SCHEMA public TO sol_migrator;

-- App: table DML + sequence usage. No CREATE/DROP/TRUNCATE/ALTER.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sol_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sol_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sol_app;

-- Migrator: full DDL on public (owner-equivalent for schema changes).
GRANT CREATE ON SCHEMA public TO sol_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sol_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sol_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO sol_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO sol_migrator;

-- audit_log stays append-only via trigger (0011); app still needs INSERT/SELECT.
-- Explicitly ensure sol_app cannot bypass via TRUNCATE (not granted above).

COMMIT;

-- Optional verification (run as owner after the transaction):
--   SELECT rolname FROM pg_roles WHERE rolname IN ('sol_app', 'sol_migrator');
--   SET ROLE sol_app; CREATE TABLE _should_fail (id int);  -- must ERROR
--   RESET ROLE;
