# MCP agent access (professor personal access tokens)

SOL exposes a hosted **MCP (Model Context Protocol) server** at `/api/mcp` so
professors can operate SOL through their own AI agents (Cursor, Claude,
ChatGPT connectors, etc.). This document records the access path, its
controls, and its FERPA posture.

## Access model

- **Who**: PROFESSOR (and ADMIN) users only. Tokens minted by any other role
  are refused at verification time; a role downgrade immediately invalidates
  the owner's tokens.
- **Credential**: personal access tokens (`sol_pat_…`), minted on the
  dashboard **Agent Access** page. Only a SHA-256 hash is stored
  (`professor_api_tokens.token_hash`); the plaintext is displayed once.
- **Scopes**: `read`, `sections:write`, `quizzes:write`, `grades:write`,
  `discussions:write`. Defaults to `read + quizzes:write`; grade-writing is
  opt-in. Session (cookie) auth is unaffected by scopes.
- **Revocation**: self-service on the Agent Access page (tombstone
  `revoked_at`); optional `expires_at`. Max 10 active tokens per user.
- **Authorization**: every MCP tool wraps the same `lib/professor/*` service
  used by the dashboard, so section-enrollment and quiz-ownership checks are
  identical to the UI. A token can never read or mutate more than its owner
  could in a browser.

## FERPA posture

- MCP tool calls that disclose education records (gradebook, attempts,
  attempt detail, transcripts, CSV export) write the same audit actions as
  the dashboard (`education.gradebook.view`, `education.attempts.list`,
  `education.attempt.view`, `education.discussion_session.view`,
  `education.grades.export`).
- Additionally every `tools/call` writes `mcp.tool.call` with the token id,
  so agent activity is distinguishable from interactive use.
- Data returned by MCP goes to the **professor's own agent/client**. That is
  a disclosure to the school official themselves, not to a new third party;
  however, what the professor's AI client then does with the data is governed
  by the institution's own AI/tooling policy. The connect guide
  ([PROFESSOR_MCP.md](../PROFESSOR_MCP.md)) tells faculty to use
  institution-approved agents only.
- Server-side AI (grading, Socratic chat) is unchanged and still follows
  [AI_EDUCATION_RECORDS.md](./AI_EDUCATION_RECORDS.md) minimization.

## Abuse controls

- Rate limits: 120 requests/min per user on `/api/mcp` and on the new
  professor GET APIs (stricter than the interactive UI budget overall);
  existing per-action buckets (quiz create, regrade, etc.) still apply to
  PAT-authenticated calls.
- Token mint/revoke is session-only (an agent holding a PAT cannot mint more
  tokens) and rate-limited; mint/revoke events are audited
  (`professor.api_token.create` / `professor.api_token.revoke`).
- Destructive tools (`archive_quiz`, `leave_section`, `unassign_*`,
  `section_copy_quiz`, `regrade_attention`) require an explicit
  `confirm: true` argument, so an agent must surface the action to the
  professor before executing it.

## Review checklist additions

- [ ] Quarterly: sample `mcp.tool.call` audit rows and match them to active
      tokens; revoke tokens unused for 90+ days.
- [ ] Quarterly: verify `professor_api_tokens` contains no plaintext secrets
      (hash + prefix only).
- [ ] On role change to STUDENT: confirm token verification refuses the
      user's existing tokens.
