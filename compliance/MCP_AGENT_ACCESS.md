# MCP agent access (professor PATs + OAuth connectors)

SOL exposes a hosted **MCP (Model Context Protocol) server** at `/api/mcp` so
professors can operate SOL through their own AI agents (Cursor, Claude Code,
Claude.ai, ChatGPT connectors, etc.). This document records the access paths,
their controls, and their FERPA posture.

## Access model

Two credentials are accepted on `/api/mcp`; both resolve to the same SOL
user row and run the same authorization checks.

### Path 1 — personal access tokens (header-based clients)

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

### Path 2 — Clerk OAuth 2.1 (Claude.ai, ChatGPT connectors)

- **Who**: the professor signs in interactively through Clerk (the same IdP
  as the dashboard) via OAuth 2.1 + PKCE; Dynamic Client Registration is
  enabled so connectors self-register. After token verification, SOL
  requires the resolved user to be PROFESSOR or ADMIN — any other role gets
  403, so a student can complete OAuth but can never call a tool.
- **Credential**: short-lived Clerk OAuth access tokens presented as the
  Bearer token. SOL stores nothing; verification is delegated to Clerk.
- **Scopes**: OAuth sessions carry the **full professor scope set**,
  identical to a dashboard session — the professor authenticated in a
  browser, so this is session-equivalent access. Least-privilege agent
  access remains available via scoped PATs.
- **Revocation**: disconnect the connector in Claude/ChatGPT, or revoke the
  OAuth application grant in Clerk; a role downgrade takes effect on the
  next request.
- **Discovery**: standard OAuth metadata is public at
  `/.well-known/oauth-protected-resource/learning/api/mcp` and
  `/.well-known/oauth-authorization-server` (RFC 9728 / 8414). These
  documents contain no user data.

### Shared authorization

- Every MCP tool wraps the same `lib/professor/*` service used by the
  dashboard, so section-enrollment and quiz-ownership checks are identical
  to the UI. Neither credential can read or mutate more than its owner
  could in a browser.

## FERPA posture

- MCP tool calls that disclose education records (gradebook, attempts,
  attempt detail, transcripts, CSV export) write the same audit actions as
  the dashboard (`education.gradebook.view`, `education.attempts.list`,
  `education.attempt.view`, `education.discussion_session.view`,
  `education.grades.export`).
- Additionally every `tools/call` writes `mcp.tool.call` with the credential
  used (`via: pat` + token id, or `via: oauth`), so agent activity is
  distinguishable from interactive use and attributable per credential. The
  audit actor is always the professor's own user id, for both paths.
- Data returned by MCP goes to the **professor's own agent/client**. That is
  a disclosure to the school official themselves, not to a new third party;
  however, what the professor's AI client then does with the data is governed
  by the institution's own AI/tooling policy. The connect guide
  ([Agent Access guide](../content/docs/professor-agent-access.md)) tells faculty to use
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
