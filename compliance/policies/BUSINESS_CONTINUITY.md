# Business Continuity / Backup

- Primary datastore: Neon Postgres with point-in-time recovery.
- App tier: Vercel redeploy from git; no durable app-local state.
- RPO: Neon PITR window (document current plan in restore drill).
- RTO: restore branch + update `DATABASE_URL` + redeploy (target < 4 hours for SEV1 data loss).
- Procedure: [`../BACKUP_RESTORE.md`](../BACKUP_RESTORE.md). Annual drill required.
