# IR tabletop template

**Date:** 2026-08-12  
**Participants:** Founder / engineering lead (solo founder tabletop)  
**Scenario:** Production `OPENAI_API_KEY` appears in a public GitHub gist; possible unauthorized API use and education-record prompt exposure risk.

## Timeline of exercise actions

| Time | Action | Owner |
| --- | --- | --- |
| T+0 | Detect key exposure (GitHub secret scanning / report) | Eng lead |
| T+15m | Rotate OpenAI key; update Vercel Production env; redeploy | Eng lead |
| T+30m | Revoke old key; review OpenAI usage logs for anomalous volume | Eng lead |
| T+1h | Check Sentry/Vercel logs; confirm no parallel secret leak | Eng lead |
| T+2h | If education records may have been exposed beyond authorized subprocessors, notify institutional contact per FERPA rider | Eng lead |
| T+1d | Postmortem: how key left vault; add checklist item | Eng lead |

## Gaps found

- Solo-founder on-call coverage is a single point of failure — document secondary contact when available.
- Need OpenAI usage-alert thresholds configured in the OpenAI org.

## Follow-ups

- [ ] Configure OpenAI spend / anomaly alerts
- [ ] Complete live [`OPENAI_ZDR_CHECKLIST.md`](./OPENAI_ZDR_CHECKLIST.md) console verification
- [ ] Add secondary IR contact on institutional rider
- [ ] Re-run tabletop with institution IT if FGCU requires joint exercise

**Policy reference:** [`../policies/INCIDENT_RESPONSE.md`](../policies/INCIDENT_RESPONSE.md)

**Sign-off:** 2026-08-12 (tabletop completed as solo exercise)
