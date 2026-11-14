/**
 * Report NULL tenant_id counts on teaching tables after Phase 2 expand.
 *
 *   I_CONFIRM_DEV_DB=1 npx tsx scripts/validate-tenant-backfill.ts
 */
import { config as loadEnv } from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

import { assertDevDatabaseOrExit } from './lib/assertDevDatabase';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

assertDevDatabaseOrExit({ urlEnvVars: ['DATABASE_MIGRATE_URL', 'DATABASE_URL'] });

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

const TENANT_TABLES = [
  'sections',
  'quizzes',
  'quiz_sections',
  'questions',
  'assignments',
  'attempts',
  'grading_cache',
  'chatbots',
  'chatbot_sections',
  'chatbot_assignments',
  'chatbot_sessions',
  'professor_sections',
  'student_sections',
  'course_materials',
  'course_material_chunks',
  'lessons',
  'lesson_sections',
  'flashcards',
  'lesson_progress',
  'interactives',
  'interactive_sections',
  'interactive_progress',
  'course_activities',
  'course_outlines',
  'outline_modules',
  'outline_items',
  'authoring_revisions',
  'authoring_messages',
  'course_knowledge_links',
  'hosted_books',
  'book_chapters',
  'book_sections',
  'lti_deployments',
  'lti_section_links',
  'lti_user_links',
  'lti_line_items',
  'lti_passback_jobs',
] as const;

async function main() {
  const url = process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_MIGRATE_URL or DATABASE_URL required');

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    console.log('NULL tenant_id counts (sol-knowledge-dev only):\n');
    let totalNull = 0;
    for (const table of TENANT_TABLES) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenant_id'`,
        [table],
      );
      if (exists.rowCount === 0) {
        console.log(`${table}: (no tenant_id column yet)`);
        continue;
      }
      const { rows } = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM "${table}" WHERE tenant_id IS NULL`,
      );
      const n = Number(rows[0]?.n ?? 0);
      totalNull += n;
      console.log(`${table}: ${n}`);
    }
    console.log(`\nTotal NULL tenant_id rows (sum of counts): ${totalNull}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
