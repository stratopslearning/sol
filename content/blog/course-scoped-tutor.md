---
title: "Your course tutor forgets the open web on purpose"
description: "What course-scoped tutoring means in SOL, how it differs from ChatGPT-style help, and when Agent Access is a different window for faculty rather than students."
audience: faculty
kind: product
order: 3
date: 2026-10-28
---

# Your course tutor forgets the open web on purpose

Written for faculty who have watched a generic chatbot invent a citation, redefine a term against the syllabus, or coach a student past the assignment’s intent. It covers the student-facing tutor window in SOL: what can enter it, what must not, and how that differs from faculty Agent Access. Session memory products and LMS content stores are out of scope except where they change retrieval.

## Quick grasp

**What.** A course-scoped tutor answers from materials you indexed for that course. It is not a general assistant with a course sticker on it. If the fact is not in the indexed materials (and the product rules for that course), it should not appear as course truth.

**Why it matters.** Open-web tutors optimize for helpfulness. Teaching tutors must optimize for fidelity to what you assigned. The failure mode is a confident wrong reading that students trust more than the PDF you uploaded.

**How, in four steps.**

1. Put the syllabus and notes into Materials and wait until Ready.
2. Release only what you approve; the tutor is grounded in that course’s indexed set.
3. Tell students the tutor is course-only, not a search engine.
4. Keep faculty agents (MCP) in a separate mental model: they act as you, with your scopes, not as a student tutor.

**When to care.** Any course where a wrong “helpful” answer creates grade appeals or academic integrity fog.

**Important:** Scope is a product rule, not a prompt suggestion. “Please only use my files” in ChatGPT is a wish. Indexed materials in SOL are the retrieval set.

## The level tree

- **Level 0:** one student question, two tutors.
- **Level 1:** what sits in the tutor’s context.
- **Level 2:** materials quality and failure modes.
- **Level 3:** Agent Access is not the student tutor.
- **Level 4:** decision guide, takeaways, references.

## Level 0: One student question

This level answers: what each tutor is allowed to know.

**Question:** “What definition of elasticity are we using for Thursday’s quiz?”

**Open-web tutor.** Pulls a textbook-adjacent definition from training data or the web. May be fine. May conflict with the definition in your Week 3 notes. Student studies the wrong one.

**SOL course tutor.** Retrieves from indexed materials for that course. If your notes define elasticity one way, that is the authority. If materials are thin or not Ready, authoring and tutoring degrade; that is a materials problem, not a “smarter model” problem.

**Carry forward:**

- Test tutors with a question whose wrong answer is plausible.
- Prefer “I don’t see that in the course materials” over a polished invention.

## Level 1: What sits in the window

This level answers: the teaching analogue of context management.

For the student tutor, the relevant “window” is the course retrieval set plus the conversation turns the product allows. The open web is not a silent third party. Faculty-facing Agent Access is a different channel: MCP tools over sections, materials, gradebooks, and Attention under professor auth. Do not describe MCP as the student tutor.

| Surface | Who | Authority |
| --- | --- | --- |
| Course tutor | Student | Indexed course materials |
| Socratic discussion bot | Student | Course-scoped discussion design |
| Agent Access (MCP) | Professor | Your account scopes + audit |

**Carry forward:**

- When someone says “AI tutor,” ask which surface and which retrieval set.
- Do not conflate faculty automation with student help.

## Level 2: Materials quality

This level answers: why “upload everything” still fails.

- Scanned PDFs without text index poorly.
- Conflicting handouts produce conflicting answers.
- Materials stuck processing never become tutor ground truth.
- Nothing in Materials is automatically a student file download; students see what you author and release.

Without Ready materials, authoring has little to ground on and the tutor risks generic answers. That trade is documented in the materials guide on purpose.

**Carry forward:**

- Invest in clean source files before blaming the model.
- Re-index when you replace a canonical reading.

## Level 3: Soft comparison to ChatGPT

| Need | Prefer |
| --- | --- |
| Brainstorm a metaphor for lecture | General chatbot |
| Student help aligned to *this* syllabus | Course-scoped tutor |
| Faculty batch ops on sections and Attention | Agent Access MCP |

ChatGPT still wins for unbounded ideation. SOL wins when the answer must be faithful to the course you are teaching.

## Decision guide

| If students… | Use |
| --- | --- |
| Need help only from assigned materials | SOL course tutor after Materials are Ready |
| Need unrestricted web research | Not the course tutor; use library tools or explicit web assignments |
| Are fishing for the answer key | Design assessments that follow up on their own work; see product loop docs |

## Takeaways

- Course scope is the product. Open-web helpfulness is the competitor’s default, not a feature to copy blindly.
- Materials Ready is a teaching prerequisite, not an IT checkbox.
- Faculty agents and student tutors are different windows with different authority.

## References

- [Course materials](/docs/professor-materials)
- [About SOL](/docs/about-sol)
- [Student getting started](/docs/student-getting-started)
- [Agent Access](/docs/professor-agent-access)
- [ChatGPT vs quiz grader vs teaching layer](/blog/vs-chatgpt-grader-lms)
