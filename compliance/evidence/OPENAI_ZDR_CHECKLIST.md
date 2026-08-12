# OpenAI ZDR / no-train checklist

**Org / project:** SOL production OpenAI org (API / Enterprise — not consumer ChatGPT)  
**Date:** 2026-08-12 (binder bootstrap)  
**Operator:** Founder / engineering lead (update name on sign-off)

Application-side controls are implemented (see [`../AI_EDUCATION_RECORDS.md`](../AI_EDUCATION_RECORDS.md)).  
**Console settings below must be verified in the live OpenAI org before FGCU packet submission.**

## Production console checks

- [ ] API or Enterprise workspace (not consumer ChatGPT) — **Operator verify in OpenAI dashboard**
- [ ] Training on customer content disabled — **Operator verify**
- [ ] Zero Data Retention (or strongest no-retention) enabled for grading + chatbot models — **Operator verify**
- [x] Production API key scoped and stored only in Vercel Production env — **Policy:** `PRODUCTION_DEPLOY.md` §1; Preview must use a separate key
- [ ] Key rotation date scheduled: __________ — **Operator set date**

## Application controls verified in codebase (2026-08-12)

- [x] Prompt minimization helper present (`lib/ai/minimizeEducationPayload.ts`)
- [x] Chatbot context omits answer keys (`lib/chatbot/safeQuizContext.ts`)
- [x] AI feedback access role-gated (`lib/quizAccess.ts`)
- [x] Binder documents ZDR requirement (`AI_EDUCATION_RECORDS.md`)

**Screenshot / ticket refs:**  
_Attach OpenAI org Data controls / ZDR screenshots here before institutional submission._

**Sign-off:** __________________ (date: ________)
