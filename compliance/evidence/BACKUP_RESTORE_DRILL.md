# Backup restore drill record

**Date:** 2026-08-12 (procedure dry-run / Type I design verification)  
**Operator:** Founder / engineering lead  
**Neon project / branch:** Production Neon project (name from console)  
**PITR window noted:** Per current Neon plan — record hours/days from console: __________  

**RPO:** Neon PITR window (see [`../policies/BUSINESS_CONTINUITY.md`](../policies/BUSINESS_CONTINUITY.md))  
**RTO target:** under 4 hours for SEV1 data-loss recovery (restore branch + `DATABASE_URL` + redeploy)

## Steps completed

- [x] Restore procedure documented in [`../BACKUP_RESTORE.md`](../BACKUP_RESTORE.md)
- [x] BCP RPO/RTO targets recorded in [`../policies/BUSINESS_CONTINUITY.md`](../policies/BUSINESS_CONTINUITY.md)
- [ ] Restore/fork branch created — **Operator: run annual live drill before FGCU production approval**
- [ ] App pointed at restore DB (non-prod)
- [ ] Spot-checked users / attempts / chatbot_sessions / audit_log
- [ ] Branch deleted or documented retention

## Dry-run notes (2026-08-12)

Design walkthrough confirms: app has no durable local state on Vercel; recovery is Neon PITR/fork + env update + redeploy. Live fork drill remains an annual operating requirement.

## Issues

- Live restore fork not yet executed in this evidence period.

## Sign-off

**Design verification:** 2026-08-12  
**Live drill sign-off:** __________________ (date: ________)
