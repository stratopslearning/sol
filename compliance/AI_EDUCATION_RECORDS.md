# AI and education records (OpenAI)

SOL uses OpenAI for (1) short-answer grading and (2) Socratic discussion chatbots. Both may transmit **education-record content** (student answers, discussion messages, question stems, reference answers, rubrics).

## Production configuration checklist

Complete in the OpenAI organization that holds the production `OPENAI_API_KEY`:

1. Use an **API** or **Enterprise** workspace — not a consumer ChatGPT account.
2. Disable **training on customer content** / improve-the-model for this org.
3. Enable **Zero Data Retention (ZDR)** or the strongest available no-retention option for the models used in grading and chatbots.
4. Restrict API keys to production project; rotate on personnel change.
5. Record completion date in [`evidence/OPENAI_ZDR_CHECKLIST.md`](./evidence/OPENAI_ZDR_CHECKLIST.md).

## Application controls

- **No profile PII in prompts:** grading and chatbot paths must not send student name, email, or Clerk IDs to OpenAI.
- **Minimization:** [`lib/ai/minimizeEducationPayload.ts`](../lib/ai/minimizeEducationPayload.ts) redacts email-shaped strings from outbound student text.
- **Chatbots:** [`lib/chatbot/safeQuizContext.ts`](../lib/chatbot/safeQuizContext.ts) never injects answer keys or attempt feedback.
- **Access:** AI feedback (`gptFeedback`) is part of the education record and is role-gated via [`lib/quizAccess.ts`](../lib/quizAccess.ts).
- **Integrity:** scores are computed in TypeScript from rubric matches; model output alone is not trusted as a raw numeric grade.

## Braintrust (LLM/agent observability + evals)

SOL may send minimized education-record text (student answers, discussion messages) to **Braintrust** for production tracing and synthetic regression evals. MCP traces log tool names and outcome classes only — not gradebook rows, attempt payloads, or discussion transcripts.

### Production configuration checklist

Complete before enabling production tracing (`BRAINTRUST_API_KEY` in Vercel Production):

1. Execute Braintrust **DPA** / subprocessor terms suitable for FERPA education records.
2. Disable **training** on customer content for the Braintrust project/org.
3. Set **retention** to the shortest practical window (align with OpenAI ZDR posture).
4. Configure **`BRAINTRUST_SAMPLE_RATE`** (default `0.2` in production) — failures are always logged.
5. Never attach profile PII in trace metadata (Clerk IDs, emails, names, token IDs). Application code enforces this in [`lib/ai/tracing.ts`](../lib/ai/tracing.ts).
6. Run synthetic evals via `npm run eval` / [`.github/workflows/evals.yml`](../.github/workflows/evals.yml) — eval datasets contain **no live student data**.

### Application controls

- **Sampling:** [`lib/ai/tracing.ts`](../lib/ai/tracing.ts) no-ops when `BRAINTRUST_API_KEY` is unset (same pattern as optional Sentry).
- **OpenAI wrapping:** [`lib/ai/openai.ts`](../lib/ai/openai.ts) uses `wrapOpenAI` only when Braintrust is enabled.
- **MCP:** tool argument values and return payloads are **not** sent to Braintrust; audit attribution stays in [`audit_log`](../app/db/schema.ts).

## Incident note

If OpenAI retention or training settings drift, treat as a potential unauthorized redisclosure: follow [`policies/INCIDENT_RESPONSE.md`](./policies/INCIDENT_RESPONSE.md) and notify institutional contacts per the FERPA rider.
