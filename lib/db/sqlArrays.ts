import { SQL, sql } from 'drizzle-orm';

/** Bind a JS string[] as a Postgres uuid[] (drizzle expands arrays as row tuples otherwise). */
export function asUuidArray(ids: string[]): SQL {
  if (ids.length === 0) return sql`ARRAY[]::uuid[]`;
  return sql`ARRAY[${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )}]`;
}
