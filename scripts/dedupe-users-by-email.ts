/**
 * Merge duplicate users that share the same email (case-insensitive).
 *
 * Keeper selection: ADMIN > PROFESSOR > STUDENT, then most FK activity,
 * then newest created_at. Reassigns FKs from losers → keeper, deletes losers.
 *
 * Usage: npx tsx scripts/dedupe-users-by-email.ts
 * Requires DATABASE_URL in the environment (or .env).
 */
import fs from 'node:fs';
import path from 'node:path';

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));

const ROLE_RANK: Record<string, number> = {
  ADMIN: 3,
  PROFESSOR: 2,
  STUDENT: 1,
};

type Sql = NeonQueryFunction<false, false>;

type UserRow = {
  id: string;
  clerk_id: string;
  email: string;
  role: string;
  created_at: string;
};

async function activityScore(sql: Sql, userId: string): Promise<number> {
  const rows = (await sql`
    SELECT (
      (SELECT COUNT(*)::int FROM professor_sections WHERE professor_id = ${userId}) +
      (SELECT COUNT(*)::int FROM student_sections WHERE student_id = ${userId}) +
      (SELECT COUNT(*)::int FROM quizzes WHERE professor_id = ${userId}) +
      (SELECT COUNT(*)::int FROM assignments WHERE student_id = ${userId}) +
      (SELECT COUNT(*)::int FROM attempts WHERE student_id = ${userId}) +
      (SELECT COUNT(*)::int FROM chatbots WHERE professor_id = ${userId}) +
      (SELECT COUNT(*)::int FROM chatbot_assignments WHERE student_id = ${userId}) +
      (SELECT COUNT(*)::int FROM chatbot_sessions WHERE student_id = ${userId}) +
      (SELECT COUNT(*)::int FROM professor_api_tokens WHERE user_id = ${userId}) +
      (SELECT COUNT(*)::int FROM audit_log WHERE actor_user_id = ${userId})
    ) AS n`) as Array<{ n: number }>;
  return Number(rows[0]?.n ?? 0);
}

function pickKeeper(a: UserRow, aScore: number, b: UserRow, bScore: number): UserRow {
  const ra = ROLE_RANK[a.role] ?? 0;
  const rb = ROLE_RANK[b.role] ?? 0;
  if (ra !== rb) return ra > rb ? a : b;
  if (aScore !== bScore) return aScore > bScore ? a : b;
  return new Date(a.created_at) >= new Date(b.created_at) ? a : b;
}

async function mergeLoserIntoKeeper(
  sql: Sql,
  keeperId: string,
  loserId: string,
) {
  // Unique (professor_id, section_id): drop loser rows that would collide.
  await sql`
    DELETE FROM professor_sections AS l
    WHERE l.professor_id = ${loserId}
      AND EXISTS (
        SELECT 1 FROM professor_sections k
        WHERE k.professor_id = ${keeperId} AND k.section_id = l.section_id
      )`;
  await sql`
    UPDATE professor_sections SET professor_id = ${keeperId}
    WHERE professor_id = ${loserId}`;

  await sql`
    DELETE FROM student_sections AS l
    WHERE l.student_id = ${loserId}
      AND EXISTS (
        SELECT 1 FROM student_sections k
        WHERE k.student_id = ${keeperId} AND k.section_id = l.section_id
      )`;
  await sql`
    UPDATE student_sections SET student_id = ${keeperId}
    WHERE student_id = ${loserId}`;

  await sql`
    UPDATE quizzes SET professor_id = ${keeperId}
    WHERE professor_id = ${loserId}`;

  await sql`
    UPDATE quiz_sections SET assigned_by = ${keeperId}
    WHERE assigned_by = ${loserId}`;

  await sql`
    DELETE FROM assignments AS l
    WHERE l.student_id = ${loserId}
      AND EXISTS (
        SELECT 1 FROM assignments k
        WHERE k.student_id = ${keeperId} AND k.quiz_id = l.quiz_id
      )`;
  await sql`
    UPDATE assignments SET student_id = ${keeperId}
    WHERE student_id = ${loserId}`;

  await sql`
    UPDATE attempts SET student_id = ${keeperId}
    WHERE student_id = ${loserId}`;

  await sql`
    UPDATE audit_log SET actor_user_id = ${keeperId}
    WHERE actor_user_id = ${loserId}`;

  await sql`
    UPDATE chatbots SET professor_id = ${keeperId}
    WHERE professor_id = ${loserId}`;

  await sql`
    UPDATE chatbot_sections SET assigned_by = ${keeperId}
    WHERE assigned_by = ${loserId}`;

  await sql`
    DELETE FROM chatbot_assignments AS l
    WHERE l.student_id = ${loserId}
      AND EXISTS (
        SELECT 1 FROM chatbot_assignments k
        WHERE k.student_id = ${keeperId} AND k.chatbot_id = l.chatbot_id
      )`;
  await sql`
    UPDATE chatbot_assignments SET student_id = ${keeperId}
    WHERE student_id = ${loserId}`;

  await sql`
    UPDATE chatbot_sessions SET student_id = ${keeperId}
    WHERE student_id = ${loserId}`;

  // Tokens: drop loser's to avoid leaving stale PATs under a merged identity.
  await sql`DELETE FROM professor_api_tokens WHERE user_id = ${loserId}`;

  await sql`DELETE FROM users WHERE id = ${loserId}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = neon(url);

  const groups = (await sql`
    SELECT lower(email) AS email
    FROM users
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
    ORDER BY email`) as { email: string }[];

  console.log(`Found ${groups.length} duplicate email group(s)`);

  for (const g of groups) {
    const rows = (await sql`
      SELECT id, clerk_id, email, role, created_at
      FROM users
      WHERE lower(email) = ${g.email}
      ORDER BY created_at`) as UserRow[];

    let keeper = rows[0];
    let keeperScore = await activityScore(sql, keeper.id);
    for (let i = 1; i < rows.length; i++) {
      const score = await activityScore(sql, rows[i].id);
      const next = pickKeeper(keeper, keeperScore, rows[i], score);
      if (next.id === rows[i].id) {
        keeper = rows[i];
        keeperScore = score;
      }
    }

    const losers = rows.filter((r) => r.id !== keeper.id);
    console.log(
      `Merging ${g.email}: keep ${keeper.id} (${keeper.role}, clerk=${keeper.clerk_id}); drop ${losers.map((l) => l.id).join(', ')}`,
    );

    for (const loser of losers) {
      await mergeLoserIntoKeeper(sql, keeper.id, loser.id);
    }
  }

  // Normalize emails to lowercase for consistency with the unique index.
  await sql`UPDATE users SET email = lower(email) WHERE email <> lower(email)`;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
    ON users (lower(email))
    WHERE email <> ''`;

  const remaining = await sql`
    SELECT lower(email) AS email, COUNT(*)::int AS n
    FROM users
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY lower(email)
    HAVING COUNT(*) > 1`;
  console.log('Remaining duplicate groups:', remaining.length);
  if (remaining.length > 0) {
    console.error(remaining);
    process.exit(1);
  }
  console.log('Dedupe complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
