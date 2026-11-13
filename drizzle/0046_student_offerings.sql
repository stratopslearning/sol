-- Wave 3 item 20: student_offerings — offering-level enrollment, dual-written
-- alongside student_sections (section-level) by lib/enrollment/sources.ts.
-- LOCAL + sol-knowledge-dev only. Expand phase: readers keep using student_sections.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS student_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DROPPED')),
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS student_offerings_student_offering_uidx
  ON student_offerings (student_id, offering_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS student_offerings_offering_idx
  ON student_offerings (offering_id) WHERE status = 'ACTIVE';

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS student_offerings_tenant_idx
  ON student_offerings (tenant_id);

--> statement-breakpoint
-- Backfill from existing section enrollments (needs 0045 so offering_id is populated).
-- Sources start empty here; dual-write in lib/enrollment/sources.ts keeps them
-- current going forward (and section rows remain source of truth during expand).
INSERT INTO student_offerings (tenant_id, student_id, offering_id, status, sources, enrolled_at)
SELECT
  COALESCE(ss.tenant_id, s.tenant_id, s.workspace_id),
  ss.student_id,
  COALESCE(ss.offering_id, s.offering_id),
  CASE WHEN bool_or(ss.status = 'ACTIVE') THEN 'ACTIVE' ELSE 'DROPPED' END,
  '[]'::jsonb,
  min(ss.enrolled_at)
FROM student_sections ss
JOIN sections s ON s.id = ss.section_id
WHERE COALESCE(ss.offering_id, s.offering_id) IS NOT NULL
  AND COALESCE(ss.tenant_id, s.tenant_id, s.workspace_id) IS NOT NULL
GROUP BY
  COALESCE(ss.tenant_id, s.tenant_id, s.workspace_id),
  ss.student_id,
  COALESCE(ss.offering_id, s.offering_id)
ON CONFLICT (student_id, offering_id) DO NOTHING;

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sol_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON student_offerings TO sol_app;
  END IF;
END
$$;

--> statement-breakpoint
ALTER TABLE student_offerings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE student_offerings FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON student_offerings;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON student_offerings
  USING (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id::text = NULLIF(current_setting('app.tenant_id', true), ''));
