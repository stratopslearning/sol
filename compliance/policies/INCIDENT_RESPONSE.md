# Incident Response

## Severity

- **SEV1:** Confirmed unauthorized access to education records or production secrets leaked.
- **SEV2:** Suspected breach, widespread outage affecting grading integrity, or subprocessor retention misconfiguration.
- **SEV3:** Isolated bugs without evidence of record exposure.

## Steps

1. **Detect** — Sentry, Vercel logs, Neon, Stripe, user report.
2. **Contain** — rotate keys, revoke sessions (Clerk), disable misconfigured integration, soft-delete/purge if warranted.
3. **Eradicate / recover** — patch, redeploy, restore from Neon PITR if needed ([`../BACKUP_RESTORE.md`](../BACKUP_RESTORE.md)).
4. **Notify** — institutional contacts per FERPA rider window; document in `evidence/`.
5. **Postmortem** — root cause, timeline, actions; file under `evidence/`.

Run a tabletop at least annually ([`../evidence/IR_TABLETOP_TEMPLATE.md`](../evidence/IR_TABLETOP_TEMPLATE.md)).
