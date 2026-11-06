---
title: Canvas LTI setup
description: Install SOL as an LTI 1.3 Advantage tool in Canvas for SSO launch, roster sync, and grade passback when LTI is enabled.
audience: admin
order: 40
---

# Canvas LTI setup

SOL can connect to Canvas with **LTI 1.3 Advantage**: launch with SSO, sync roster (NRPS), and send grades (AGS). Enrollment codes still work. This connector is **off** until `LTI_ENABLED=true` and the env vars below are set.

Do not tell faculty that sync is live until those vars are configured in the target environment.

## What does Canvas LTI enable?

| Capability | Behavior |
| --- | --- |
| Launch | Faculty/students open SOL from a Canvas course; Clerk session is created via sign-in ticket |
| Section link | Faculty pastes Canvas course ID on the SOL section page |
| Roster | NRPS sync on instructor launch + daily cron; code-enrolled students without LTI links are not dropped |
| Line items | Created when a quiz/lesson/discussion/interactive is **released** on a linked section (after AGS URLs are known from a Canvas launch) |
| Quiz grades | Posted when the attempt is fully graded (`gradingStatus=complete`, no Attention-pending items), using the same best-score rule as the SOL gradebook |
| Completion | Lessons, discussions, and interactives post 100 when completed |

## Which environment variables are required?

Set all of these together with `LTI_ENABLED=true`:

- `LTI_ISSUER` — Canvas issuer (e.g. `https://canvas.instructure.com` or your school Canvas URL)
- `LTI_CLIENT_ID` — Developer key client id
- `LTI_AUTH_LOGIN_URL` — Canvas OIDC auth endpoint
- `LTI_AUTH_TOKEN_URL` — Canvas OAuth2 token endpoint
- `LTI_KEY_SET_URL` — Canvas JWKS URL
- `LTI_DEPLOYMENT_ID` — Deployment id from the developer key
- `LTI_TOOL_PRIVATE_KEY` / `LTI_TOOL_PUBLIC_KEY` — RS256 PEM (use `\n` for newlines in env)
- `LTI_TOOL_KEY_ID` — Key id published in JWKS
- `LTI_PLATFORM_LABEL` — Optional display name (default `Canvas`)

## How do I register a Canvas developer key?

Register a **public LTI 1.3** developer key with:

| Field | Value |
| --- | --- |
| OpenID Connect Initiation URL | `{BASE}/learning/api/lti/login` |
| Target Link URI / Redirect URI | `{BASE}/learning/api/lti/launch` |
| JWK URL | `{BASE}/learning/api/lti/jwks` |

Enable **Assignment and Grade Services** and **Names and Role Provisioning Services**.

Replace `{BASE}` with `NEXT_PUBLIC_BASE_URL` (no trailing slash).

## Faculty steps

1. Admin enables LTI env on the SOL deployment
2. Faculty opens the SOL **section** page → **Canvas** panel → paste Canvas course ID → Link
3. From Canvas, launch the SOL tool once (so AGS/NRPS URLs are stored)
4. Release assignments in SOL as usual; quiz scores pass back after grading completes

## Admin UI

Institution admins can review deployment URLs and section links under **Canvas LTI** in the admin sidebar.

## Crons

- `/learning/api/cron/grade-pending` — pending short-answer grading sweep
- `/learning/api/cron/process-materials` — stuck course-material extract/embed
- `/learning/api/cron/lti-roster` — roster refresh (Bearer `CRON_SECRET`)
- `/learning/api/cron/lti-passback` — retry failed grade posts

Paths must include the `/learning` basePath (see `vercel.json`).

## Failure copy

If Canvas is unreachable, grades stay in SOL and jobs retry. Prefer: *We couldn't reach Canvas. Your grades are saved, and we'll retry in a few minutes.*
