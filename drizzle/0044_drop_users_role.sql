-- Wave 2 item 18: retire users.role as an authority source.
-- LOCAL + sol-knowledge-dev only. Expand-then-contract.
--
-- This migration is the SAFE half of the contract:
--   1. backfill users.platform_staff from legacy role = 'ADMIN'
--   2. verify nothing was missed (fails the migration otherwise)
--   3. make users.role nullable + mark deprecated (code still reads it during cutover)
--   4. DROP COLUMN only when the session opts in with
--        SET LOCAL sol.drop_users_role = 'on';
--      which scripts/contract-drop-users-role.ts does after checking that the
--      legacy authz count is ~0. Until then `users.role` stays (nullable) so
--      schema.ts / un-cut-over call sites keep working.

UPDATE users
SET platform_staff = true, updated_at = now()
WHERE role = 'ADMIN' AND platform_staff = false;

DO $$
DECLARE
  missed integer;
BEGIN
  SELECT count(*) INTO missed
  FROM users
  WHERE role = 'ADMIN' AND platform_staff = false;
  IF missed > 0 THEN
    RAISE EXCEPTION '0044: % legacy ADMIN users lack platform_staff after backfill', missed;
  END IF;
END
$$;

ALTER TABLE users ALTER COLUMN role DROP NOT NULL;
COMMENT ON COLUMN users.role IS 'DEPRECATED (0044): not an authority source. Use role_bindings / users.platform_staff.';

DO $$
BEGIN
  IF current_setting('sol.drop_users_role', true) = 'on' THEN
    ALTER TABLE users DROP COLUMN IF EXISTS role;
    RAISE NOTICE '0044: users.role dropped';
  ELSE
    RAISE NOTICE '0044: users.role retained (nullable, deprecated); run scripts/contract-drop-users-role.ts after cutover';
  END IF;
END
$$;
