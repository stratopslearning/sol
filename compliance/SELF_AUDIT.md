# Internal self-audit (mimic Type I / Type II)

## Type I–style (design) — once after hardening, then after major changes

1. Walk every row in [`CONTROL_MATRIX.md`](./CONTROL_MATRIX.md).
2. For each `gap`/`partial`, open a fix or document compensating control.
3. Record results in [`evidence/TYPE1_WALKTHROUGH.md`](./evidence/TYPE1_WALKTHROUGH.md).

## Type II–style (operating) — recurring

| Cadence | Activity | Evidence template |
| --- | --- | --- |
| Quarterly | Admin + cloud console access review | `evidence/ACCESS_REVIEW_TEMPLATE.md` |
| Quarterly | Sample FERPA-sensitive `audit_log` rows (enrollment, gradebook, export, purge, disclosure) | Copy into `evidence/AUDIT_LOG_SAMPLE_YYYYQn.md` |
| Monthly | `npm audit` / Dependabot triage | `evidence/NPM_AUDIT_YYYYMM.md` |
| Annual | IR tabletop | `evidence/IR_TABLETOP_TEMPLATE.md` |
| Annual | Neon restore drill | `evidence/BACKUP_RESTORE_DRILL.md` |
| On OpenAI change | Reconfirm ZDR / no-train | `evidence/OPENAI_ZDR_CHECKLIST.md` |

No external CPA letter is produced; this folder is the compliance binder.
