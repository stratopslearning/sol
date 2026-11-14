/**
 * Migrate scripts must use sol_migrator (or owner during bootstrap), never sol_app.
 */
export function usernameFromDatabaseUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).username);
  } catch {
    throw new Error('Database URL is not a valid URL (cannot parse username).');
  }
}

/**
 * Refuse sol_app for DDL. Allow sol_migrator; allow neondb_owner only when
 * ALLOW_OWNER_MIGRATE=1 (Neon bootstrap before sol_migrator exists).
 */
export function assertMigrateRole(url: string): string {
  const username = usernameFromDatabaseUrl(url);
  const lower = username.toLowerCase();
  if (lower === 'sol_app') {
    throw new Error(
      'Refusing migrate: DATABASE_MIGRATE_URL / DATABASE_URL uses sol_app. Migrations must run as sol_migrator (set DATABASE_MIGRATE_URL).',
    );
  }
  if (lower === 'neondb_owner' || lower.includes('owner')) {
    if (process.env.ALLOW_OWNER_MIGRATE !== '1') {
      throw new Error(
        'Refusing migrate: owner role detected. Prefer DATABASE_MIGRATE_URL=sol_migrator. Set ALLOW_OWNER_MIGRATE=1 only for one-off Neon role bootstrap.',
      );
    }
  }
  return username;
}

export function assertMigrateRoleOrExit(url: string): string {
  try {
    const username = assertMigrateRole(url);
    console.log(`[migrate-role] OK user=${username}`);
    return username;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[migrate-role] ${message}`);
    process.exit(1);
  }
}
