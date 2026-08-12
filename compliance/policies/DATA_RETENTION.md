# Data Retention & Disposal

| Data | Retention | Disposal |
| --- | --- | --- |
| Active course enrollments, attempts, discussions | Active term + **3 years** (default; override per institution contract) | Soft-delete then admin purge; audit `*.purge` |
| Soft-deleted rows | Until purge request or retention expiry | Purge endpoints under `/api/admin/**/purge` |
| `audit_log` | **≥ 1 year** (prefer 3 years) | Do not delete via app UI; ops-only if legally required |
| Stripe events | Indefinite for idempotency (no education answers) | N/A |
| Neon PITR backups | Per Neon plan window | Expires automatically |

**Student / institution requests:** Institution directs access, amendment, or deletion. Admins execute soft-delete/purge and record `ferpa.disclosure.record` or purge audit entries. Checklist: [`../evidence/RETENTION_PURGE_CHECKLIST.md`](../evidence/RETENTION_PURGE_CHECKLIST.md).

**Institution-directed purge SLA:** Complete soft-delete and hard purge within **10 business days** of a verified written institutional request (or sooner if the contract requires). There is no automated term+3y cron yet; ops run periodic reviews against this schedule.
