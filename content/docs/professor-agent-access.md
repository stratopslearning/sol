---
title: Agent Access
description: Connect Claude, ChatGPT, Cursor, or other AI agents to your faculty workflow via MCP. OAuth connectors or personal access tokens.
audience: faculty
order: 6
---

# Agent Access : connect your AI agent to SOL

SOL ships a hosted [MCP](https://modelcontextprotocol.io) server so professors can run the teaching loop from an AI agent: materials and authoring, sections and assignments, gradebooks and Attention, discussions, and analytics.

- **Endpoint**: `https://app.teachwithsol.com/api/mcp` (Streamable HTTP)
- **Auth**: two ways in : 
  - **OAuth (Claude.ai, ChatGPT)**: paste the MCP URL into the connector UI and sign in with your SOL account. No token needed.
  - **Personal access token (Cursor, Claude Code)**: `Authorization: Bearer sol_pat_…`, minted on Dashboard → **Agent Access**.

New to SOL? Start with [Professor onboarding](/docs/professor-onboarding).

## Quick start: Claude.ai and ChatGPT (OAuth)

No token required: these products speak MCP OAuth 2.1 and SOL uses your regular login (Clerk) as the authorization server.

**Claude.ai** (Pro/Max/Team/Enterprise):

1. Settings → **Connectors** → **Add custom connector**.
2. Paste `https://app.teachwithsol.com/api/mcp` and click **Add**.
3. Click **Connect**: a SOL sign-in window opens. Sign in with your professor account and approve access.
4. In any chat, enable the SOL connector and prompt away.

**ChatGPT** (Pro/Business/Enterprise/Edu: requires Developer Mode):

1. Settings → **Apps & Connectors** → enable **Developer mode** (under Advanced), then **Create** a connector.
2. Paste `https://app.teachwithsol.com/api/mcp` as the MCP server URL, pick **OAuth** authentication, and save.
3. Complete the SOL sign-in when prompted, then use the connector in chats.

OAuth sessions carry **full professor scopes** (everything your account can do in the dashboard). If you want an agent restricted to, say, read-only access, use a scoped personal access token instead (below). Disconnecting the connector in Claude/ChatGPT revokes its access.

## 1. Mint a token (Cursor, Claude Code, scripts)

1. Sign in to SOL as a professor and open **Agent Access**.
2. Name the token after the agent that will hold it (e.g. "Cursor on my laptop") and pick scopes:

   | Scope | Allows |
   | --- | --- |
   | `read` | Sections, quizzes, gradebooks, attempts, attention queue, discussions, CSV export |
   | `sections:write` | Enroll/leave sections, set end dates, unassign quizzes/discussions |
   | `quizzes:write` | Create, edit, duplicate, archive, assign quizzes |
   | `grades:write` | Regrade attempts and the attention queue |
   | `discussions:write` | Create, edit, duplicate, assign discussion bots |
   | `materials:write` | Add or remove course knowledge materials (URLs / library) |
   | `authoring:write` | Generate/refine course outlines from materials; publish/release draft items |

3. Copy the token immediately: it is shown once and only its hash is stored.

Treat the token like a password. Revoke it on the same page if it leaks; revocation is immediate.

## 2. Connect your agent

### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "sol": {
      "url": "https://app.teachwithsol.com/api/mcp",
      "headers": { "Authorization": "Bearer sol_pat_YOUR_TOKEN" }
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http sol https://app.teachwithsol.com/api/mcp \
  --header "Authorization: Bearer sol_pat_YOUR_TOKEN"
```

### Other clients

Any MCP client that supports **remote Streamable HTTP servers with a custom Authorization header** works the same way with a PAT. Clients that only support OAuth connectors (Claude.ai, ChatGPT) use the OAuth quick start above: the server advertises standard OAuth discovery metadata under `/.well-known/oauth-protected-resource/…/api/mcp` (path includes `/learning` only when that deploy uses a base path), so any MCP-OAuth-capable client can connect with just the URL.

## 3. Prompt away

Example prompts the tool catalog is designed for:

- "List my sections and how many learners are in each."
- "Create a 10-question quiz on supply and demand for Section A, due Friday at 11:59pm, short answer with reference answers, 70% to pass."
- "Duplicate last semester's midterm and assign it to my new section."
- "Who needs grading attention right now? Regrade them."
- "Show me the gradebook for Microeconomics Section B."
- "Export last week's quiz results as CSV."
- "Summarize the discussion transcripts for my Chapter 3 bot."

Discovery pattern: agents should call `list_sections` / `list_quizzes` first to resolve ids, then use detail or mutation tools.

## Safety model

- Tools enforce the **same ownership rules as the dashboard** (you must teach the section / own the quiz). A token can never do more than you can.
- **Destructive tools** (`archive_quiz`, `leave_section`, `unassign_*`, `section_copy_quiz`, bulk `regrade_attention`) refuse to run until the agent passes `confirm: true`, which agents are instructed to do only after asking you.
- Every education-record access (gradebook, attempts, transcripts, exports) and every tool call is written to the institution's **audit log** under your user id, tagged with the credential used (token id for PATs, `oauth` for connector sessions).
- Requests are rate-limited (120/min per professor).
- FERPA note: MCP returns education records to *you* via your chosen agent. Use an agent/client approved by your institution's AI tooling policy.

## Smoke test

With a dev server running and a token in hand:

```bash
SOL_MCP_URL=http://localhost:3000/learning/api/mcp \
SOL_MCP_TOKEN=sol_pat_… \
npx tsx scripts/smoke-mcp.ts
```

## Tool catalog (v1)

| Domain | Tools |
| --- | --- |
| Me | `whoami`, `list_capabilities` |
| Sections | `list_sections`, `get_section`, `enroll_section`, `leave_section`, `set_section_ends_at`, `unassign_quiz_from_section`, `unassign_discussion_from_section` |
| Quizzes | `list_quizzes`, `get_quiz`, `create_quiz`, `update_quiz`, `duplicate_quiz`, `archive_quiz`, `section_copy_quiz`, `assign_quiz_sections` |
| Grading | `get_gradebook`, `list_attempts`, `get_attempt`, `regrade_attempt`, `list_attention`, `regrade_attention`, `export_results` |
| Discussions | `list_discussions`, `get_discussion`, `create_discussion`, `update_discussion`, `duplicate_discussion`, `assign_discussion`, `list_discussion_sessions`, `get_discussion_session` |
| Knowledge | `list_teachable_courses`, `list_materials`, `get_material`, `add_material_url`, `delete_material`, `attach_knowledge_document`, `detach_knowledge_document` |
| Authoring | `search_course_materials`, `list_outlines`, `get_outline`, `generate_outline`, `refine_outline`, `publish_outline_item`, `release_outline_item` |
| Lessons | `list_lessons` |
| Analytics | `get_concept_mastery`, `get_lesson_completion` |

The same capabilities are also available as plain REST under `/api/professor/*` with the same Bearer token, for scripts that don't speak MCP (e.g. `GET /api/professor/sections`, `GET /api/professor/quizzes`, `GET /api/professor/section/:id/gradebook`, `GET /api/professor/analytics?courseId=…`).

See also [Course analytics](/docs/professor-analytics).

## Ops: Clerk OAuth configuration (admins)

The OAuth path uses **Clerk as the MCP authorization server**. Required one-time setup in the Clerk dashboard (Configure → OAuth applications / settings):

- **Dynamic Client Registration: enabled.** ChatGPT requires DCR to self-register a client; Claude.ai uses it too when no client is pre-registered. Without it, connector setup fails with a registration error.
- **Default OAuth scopes: `openid`, `profile`, `email`.** Connectors request these during the browser flow; SOL derives all professor permissions from the authenticated user's role, not from OAuth scopes.
- **JWT access tokens: enabled**, so `/api/mcp` can verify tokens without a network round-trip on every request.
- **CIMD (Client ID Metadata Documents)**: if/when the Clerk instance supports it, prefer advertising CIMD alongside DCR: clients then identify themselves with a hosted metadata URL instead of registering. DCR must stay on regardless for ChatGPT compatibility.

How the pieces fit at runtime:

1. Connector POSTs to `/api/mcp` (or `/learning/api/mcp` on basePath deploys) with no token → **401** with a `WWW-Authenticate: Bearer resource_metadata="…"` challenge.
2. Connector fetches `https://app.teachwithsol.com/.well-known/oauth-protected-resource/api/mcp` (hosts may rewrite `.well-known` onto an internal well-known route), which names Clerk’s Frontend API as the authorization server.
3. Connector registers via DCR, runs the OAuth 2.1 + PKCE browser flow on Clerk's hosted authorize page, and retries with the OAuth access token.
4. `/api/mcp` verifies the token with Clerk, resolves the SOL user, and requires the PROFESSOR or ADMIN role: students are refused with 403.

## Related guides

- [Faculty onboarding](/docs/professor-onboarding)
- [Course materials](/docs/professor-materials)
- [Authoring from materials](/docs/professor-authoring)
- [Grading and Attention](/docs/professor-grading)
- [Course analytics](/docs/professor-analytics)
