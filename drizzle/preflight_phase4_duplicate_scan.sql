-- Pre-flight duplicate scan for Phase 4 additive migration.
--
-- Run this BEFORE applying 0003_phase4_additive.sql against any environment
-- that already has data. The migration adds UNIQUE indexes on composite keys;
-- if any row in the current database violates those keys, the index creation
-- will fail and the migration will roll back.
--
-- Usage:
--   psql "$DATABASE_URL" -f drizzle/preflight_phase4_duplicate_scan.sql
--
-- Each query below returns rows that need to be reconciled (e.g. by deleting
-- duplicates, merging, or marking older copies as INACTIVE) before running
-- the migration. An empty result for every query means it's safe to migrate.

\echo '== professor_sections duplicates =='
SELECT professor_id, section_id, COUNT(*) AS dupes
FROM professor_sections
GROUP BY professor_id, section_id
HAVING COUNT(*) > 1;

\echo '== student_sections duplicates =='
SELECT student_id, section_id, COUNT(*) AS dupes
FROM student_sections
GROUP BY student_id, section_id
HAVING COUNT(*) > 1;

\echo '== quiz_sections duplicates =='
SELECT quiz_id, section_id, COUNT(*) AS dupes
FROM quiz_sections
GROUP BY quiz_id, section_id
HAVING COUNT(*) > 1;

\echo '== assignments duplicates =='
SELECT quiz_id, student_id, COUNT(*) AS dupes
FROM assignments
GROUP BY quiz_id, student_id
HAVING COUNT(*) > 1;
