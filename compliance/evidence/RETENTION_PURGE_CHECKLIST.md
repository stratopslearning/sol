# Retention / purge checklist

**Request id / ticket:** DRY-RUN-2026-08-12  
**Institution contact:** N/A (procedure dry-run)  
**Date:** 2026-08-12  
**Admin:** Founder / engineering lead  

## Policy summary

- Default retention: active term + **3 years** ([`../policies/DATA_RETENTION.md`](../policies/DATA_RETENTION.md)).
- Disposal: soft-delete then admin purge APIs under `/api/admin/**/purge`.
- **Institution-directed purge SLA:** complete soft-delete + hard purge within **10 business days** of a verified institutional written request (unless the contract specifies a shorter window).
- No automated retention cron yet — ops execute institution-directed and end-of-retention purges manually using this checklist.

## Scope

Tables/entities to purge (example dry-run scope):  
Soft-deleted quiz / section / course rows past retention, or a specific student education-record set named by the institution.

## Steps

- [x] Confirm request authenticity (institution admin / written ticket) — **dry-run: procedure only**
- [x] Identify entities (quiz / section / course / related attempts) — **document SQL or admin UI path**
- [ ] Soft-delete completed (if applicable)
- [ ] Purge API(s) executed
- [ ] `audit_log` shows corresponding `*.purge` / disclosure entries
- [ ] Institution notified of completion

## Dry-run notes (2026-08-12)

Verified in codebase that purge routes exist for quiz, course, and section and write audit actions. Live purge against production data was **not** executed in this dry-run.

**Notes:** Before FGCU submission, execute one non-production purge drill (preview Neon branch) and attach audit_log screenshots.

**Sign-off (dry-run procedure):** 2026-08-12  
**Sign-off (live purge drill):** __________________
