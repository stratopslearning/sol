---
title: About SOL
description: What SOL is, who it is for, public URLs, roles, and how faculty and students get access. Facts agents and humans can cite.
audience: faculty
order: 0
---

# About SOL

SOL is the **AI teaching layer** for the LMS you already use. The **operating system for teaching**. It starts with Canvas. Faculty stay in control.

## Positioning

| Say | Avoid |
| --- | --- |
| Teaching layer for your LMS | “An AI quiz grader” |
| Operating system for teaching | “Replaces Canvas” |
| You approve; SOL drafts and suggests | “SOL automatically knows” |
| Built for Canvas | Live Canvas sync as shipped (until that lands) |

## What SOL does

The product is a loop, not a single feature:

1. **Build**: Upload a syllabus or notes. SOL drafts lessons, practice, and quizzes. You edit in chat and approve before anyone sees it.
2. **Tutor**: Learners get help grounded only in that course’s materials, not the open web.
3. **Assess**: Randomized variants, follow-ups about a student’s own answer, and discussions that are hard to game.
4. **Grade**: The model returns rubric matches. Code computes the score. Unsure answers wait for your review. You can adjust every score.
5. **See**: Concept-level gaps and weak questions, so you know what to reteach.

## What SOL is

- A teaching layer for **faculty** and **learners**, not a standalone LMS replacement
- Built around **courses → sections → materials → lessons / quizzes / discussions**
- Enrolment by **codes** (not a public course catalog)
- Auditable scoring on subjective work: reviewable, adjustable, never a black box

## What SOL is not

- Not “just an AI quiz grader”
- Not a self-serve open marketplace of courses
- Not a place to scrape private rosters, grades, or attempt data without authentication
- Not a general-purpose chatbot. Tutors and discussion bots are course-scoped
- Not a replacement for the instructor. You review; SOL drafts and suggests

## Roles

| Role | Who | Can do |
| --- | --- | --- |
| `STUDENT` | Learners (default for new accounts) | Enroll with a learner code, take lessons and quizzes, use the course tutor, view own grades |
| `PROFESSOR` | Verified faculty | Join sections with a faculty code, upload materials, author/assign work, grade, use analytics and Agent Access / MCP |
| `ADMIN` | Institutional operators | Manage users/roles, courses, sections, audit log |

## Public URLs

| Resource | URL |
| --- | --- |
| App | https://www.strat-ops.net/learning |
| Docs | https://www.strat-ops.net/learning/docs |
| This page (HTML) | https://www.strat-ops.net/learning/docs/about-sol |
| This page (markdown) | https://www.strat-ops.net/learning/docs/about-sol.md |
| LLM index | https://www.strat-ops.net/learning/llms.txt |
| Docs LLM index | https://www.strat-ops.net/learning/docs/llms.txt |
| Security | https://www.strat-ops.net/learning/security |
| Professor MCP | https://www.strat-ops.net/learning/api/mcp |

## How faculty get access

1. Sign up with a **school email**.
2. Notify the institution’s SOL admin for verification.
3. An admin changes the account role to **Professor**.
4. Admin provisions course/section and shares a **faculty enrolment code**.
5. Professor joins the section, uploads materials, authors work, and shares the **learner** code with students.

Details: [Faculty onboarding](/docs/professor-onboarding).

## How students get access

1. Sign up / sign in.
2. Enter the **learner enrolment code** from their professor.
3. Open assigned lessons, quizzes, discussions, tutor, and grades.

Details: [Student getting started](/docs/student-getting-started).

## AI agents

Verified professors can connect agents (Claude, ChatGPT, Cursor, etc.) via MCP. OAuth connectors or personal access tokens minted under **Agent Access**.

Details: [Agent Access](/docs/professor-agent-access).

Agents must not claim access to education records without a professor/admin credential. Public docs and `llms.txt` describe the product; private data stays behind auth.

## Related guides

- [Faculty onboarding](/docs/professor-onboarding)
- [Course materials](/docs/professor-materials)
- [Authoring from materials](/docs/professor-authoring)
- [Grading and Attention](/docs/professor-grading)
- [Course analytics](/docs/professor-analytics)
- [Student getting started](/docs/student-getting-started)
- [Agent Access](/docs/professor-agent-access)
