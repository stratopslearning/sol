# Neon backup / restore drill

## Preconditions

- Access to Neon console for the production project.
- Ability to create a branch and temporarily point a staging deploy at it.

## Procedure

1. In Neon, note current PITR window and plan (record in evidence).
2. Create a **restore branch** at a chosen timestamp (or fork current HEAD for dry-run).
3. Obtain the branch connection string.
4. Point a non-production Vercel env (or local) at the restore branch; run `npm run db:preflight` if available.
5. Spot-check education-record tables: `users`, `attempts`, `chatbot_sessions`, `audit_log`.
6. Tear down the restore branch when done.
7. File results in [`evidence/BACKUP_RESTORE_DRILL.md`](./evidence/BACKUP_RESTORE_DRILL.md).

## Production incident restore

1. Create restore branch at last-known-good time.
2. Validate data.
3. Swap production `DATABASE_URL` to restored branch (or promote per Neon docs).
4. Redeploy / restart app; verify login + gradebook.
5. Rotate credentials if breach-related; follow incident response.
