# Runtime database roles

SOL separates the **application** role from the **migrator** role so RLS FORCE cannot be bypassed at runtime.

| Environment | App `DATABASE_URL` role | Migrate `DATABASE_MIGRATE_URL` role |
| --- | --- | --- |
| local | `sol_app` | `sol_migrator` (or owner only for one-off role bootstrap) |
| sol-knowledge-dev | `sol_app` | `sol_migrator` |
| preview / staging | `sol_app` | `sol_migrator` (CI migrate job) |
| production | `sol_app` (when promoted) | `sol_migrator` |

## Runtime guard

At Node boot (instrumentation), health checks, and worker bootstrap, [`lib/db/assertRuntimeRole.ts`](../../lib/db/assertRuntimeRole.ts) refuses to continue if `current_user`:

1. has `rolbypassrls`,
2. owns any `public` table, or
3. is a `MEMBER` of any distinct public table-owner role,

or if the username is `sol_migrator` / `neondb_owner` / `*owner*`.

The probe result is cached once per process.

## Operator notes

- Create roles with [`scripts/sql/create-app-role.sql`](../../scripts/sql/create-app-role.sql) as Neon owner.
- Never point app `DATABASE_URL` at the project owner.
- Override username string checks in emergencies only: `SOL_REQUIRE_APP_ROLE=0` (does **not** disable the Postgres privilege probe).
