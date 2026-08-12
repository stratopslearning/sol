---
title: About SOL
description: What SOL is, who it is for, public URLs, roles, and how faculty and students get access — facts agents and humans can cite.
audience: faculty
order: 0
---

# About SOL

SOL is an academic learning management system for institutions that take pedagogy seriously. Faculty author structured, auto-graded coursework (including AI-graded short answers with visible rationale); students enroll into sections by code and complete assigned quizzes and discussions.

## What SOL is

- A coursework platform for **faculty** and **students**
- Built around **courses → sections → quizzes / discussions**
- Enrolment by **codes** (not a public course catalog)
- AI-assisted grading that remains **reviewable and auditable** by the institution

## What SOL is not

- Not a self-serve open marketplace of courses
- Not a place to scrape private rosters, grades, or attempt data without authentication
- Not a general-purpose chat product — discussion bots are assigned coursework

## Roles

| Role | Who | Can do |
| --- | --- | --- |
| `STUDENT` | Learners (default for new accounts) | Enroll with a learner code, take quizzes, view own grades |
| `PROFESSOR` | Verified faculty | Join sections with a faculty code, author/assign work, grade, use Agent Access / MCP |
| `ADMIN` | Institutional operators | Manage users/roles, courses, sections, audit log |

## Public URLs

| Resource | URL |
| --- | --- |
| App | https://www.strat-ops.net/learning |
| Docs | https://www.strat-ops.net/learning/docs |
| This page (HTML) | https://www.strat-ops.net/learning/docs/about-sol |
| This page (markdown) | https://www.strat-ops.net/learning/docs/about-SOLmd |
| LLM index | https://www.strat-ops.net/learning/llms.txt |
| Docs LLM index | https://www.strat-ops.net/learning/docs/llms.txt |
| Professor MCP | https://www.strat-ops.net/learning/api/mcp |

## How faculty get access

1. Sign up with a **school email**.
2. Notify the institution’s SOL admin for verification.
3. An admin changes the account role to **Professor**.
4. Admin provisions course/section and shares a **faculty enrolment code**.
5. Professor joins the section, shares the **learner** code with students, and assigns work.

Details: [Professor onboarding](/docs/professor-onboarding).

## How students get access

1. Sign up / sign in.
2. Enter the **learner enrolment code** from their professor.
3. Open assigned quizzes, discussions, and grades.

Details: [Student getting started](/docs/student-getting-started).

## AI agents

Verified professors can connect agents (Claude, ChatGPT, Cursor, etc.) via MCP — OAuth connectors or personal access tokens minted under **Agent Access**.

Details: [Agent Access](/docs/professor-agent-access).

Agents must not claim access to education records without a professor/admin credential. Public docs and `llms.txt` describe the product; private data stays behind auth.

## Related guides

- [Professor onboarding](/docs/professor-onboarding)
- [Student getting started](/docs/student-getting-started)
- [Agent Access](/docs/professor-agent-access)
