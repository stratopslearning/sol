-- Wave 2 (items 10 + 13): role binding constraints + seat-only membership.
-- LOCAL + sol-knowledge-dev only. Expand-then-contract: no prior migration edited.
--
-- BEFORE applying on a database with data run:
--   I_CONFIRM_DEV_DB=1 npx tsx scripts/report-role-binding-conflicts.ts --apply
-- which auto-revokes strict-superset duplicates and exits non-zero on anything else.

-- 1) Hard-fail with a clear message if active data would violate the new rules.
DO $$
DECLARE
  bad_pairs integer;
  dup_groups integer;
BEGIN
  SELECT count(*) INTO bad_pairs
  FROM role_bindings
  WHERE revoked_at IS NULL
    AND NOT (
      (role = 'owner' AND scope_type = 'organization') OR
      (role IN ('admin', 'faculty') AND scope_type IN ('organization', 'department')) OR
      (role IN ('lead_instructor', 'co_instructor', 'ta', 'grader')
        AND scope_type IN ('offering', 'section'))
    );

  SELECT count(*) INTO dup_groups FROM (
    SELECT 1
    FROM role_bindings
    WHERE revoked_at IS NULL
    GROUP BY user_id, scope_type, scope_id
    HAVING count(*) > 1
  ) d;

  IF bad_pairs > 0 OR dup_groups > 0 THEN
    RAISE EXCEPTION
      '0043: % invalid (role,scope_type) rows and % duplicate active (user,scope) groups. Run scripts/report-role-binding-conflicts.ts --apply and resolve manually.',
      bad_pairs, dup_groups;
  END IF;
END
$$;

-- 2) (role, scope_type) CHECK. NOT VALID keeps revoked legacy rows untouched;
--    all active rows were verified above so we can validate immediately.
ALTER TABLE role_bindings DROP CONSTRAINT IF EXISTS role_bindings_role_scope_check;
ALTER TABLE role_bindings
  ADD CONSTRAINT role_bindings_role_scope_check CHECK (
    (role = 'owner' AND scope_type = 'organization') OR
    (role IN ('admin', 'faculty') AND scope_type IN ('organization', 'department')) OR
    (role IN ('lead_instructor', 'co_instructor', 'ta', 'grader')
      AND scope_type IN ('offering', 'section'))
  ) NOT VALID;

-- Revoked rows with legacy pairs are tolerated; do not VALIDATE (would scan revoked history).

-- 3) One active role per (user, scope).
CREATE UNIQUE INDEX IF NOT EXISTS role_bindings_active_user_scope_uidx
  ON role_bindings (user_id, scope_type, scope_id)
  WHERE revoked_at IS NULL;

-- 4) Membership seats carry no power: 'member' is the only value writers use.
--    role is plain text (TS-level enum), so this is a data backfill.
--    Legacy values stay valid for reads during the expand window; a later
--    contract migration may drop the column ("planning column drop").
UPDATE workspace_memberships
SET role = 'member', updated_at = now()
WHERE role <> 'member';

ALTER TABLE workspace_memberships
  ALTER COLUMN role SET DEFAULT 'member';
