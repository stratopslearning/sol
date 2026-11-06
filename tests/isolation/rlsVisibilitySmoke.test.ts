/**
 * Smoke: DEFINER helpers are callable and return shapes under TEST_DATABASE_URL.
 * Avoids fixture seed (sections.require offering_id on this branch).
 */
import { describe, expect, it } from 'vitest';
import { neon } from '@neondatabase/serverless';

const skip = !process.env.TEST_DATABASE_URL;

describe.skipIf(skip)('RLS visibility DEFINER smoke', () => {
  it('exposes teaching + course DEFINER functions', async () => {
    const sql = neon(process.env.TEST_DATABASE_URL!, { fullResults: true });
    const rows = await sql.query(`
      SELECT proname
      FROM pg_proc
      WHERE proname IN (
        'sol_user_teaching_section_ids',
        'sol_course_by_id',
        'sol_workspace_courses',
        'sol_user_enrollments_detail',
        'sol_workspace_team_members'
      )
      ORDER BY 1
    `);
    const names = (rows.rows ?? rows).map(
      (r: { proname: string }) => r.proname,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'sol_course_by_id',
        'sol_user_enrollments_detail',
        'sol_user_teaching_section_ids',
        'sol_workspace_courses',
        'sol_workspace_team_members',
      ]),
    );
  });

  it('sol_course_by_id returns null for missing id (no throw)', async () => {
    const { fetchCourseById } = await import('@/lib/db/entityScopedReads');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
    (globalThis as { __neonPool__?: unknown }).__neonPool__ = undefined;
    const course = await fetchCourseById(
      '00000000-0000-4000-8000-000000000099',
    );
    expect(course).toBeNull();
  });
});
