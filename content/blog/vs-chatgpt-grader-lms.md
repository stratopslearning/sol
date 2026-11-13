---
title: "ChatGPT, an AI quiz grader, or a teaching layer: same syllabus, three outcomes"
description: "One faculty ticket run three ways. Where generic chat wins, where quiz-only graders win, where SOL wins as a teaching layer, and when you should not buy SOL."
audience: both
kind: vs
order: 1
date: 2026-10-28
---

# ChatGPT, an AI quiz grader, or a teaching layer: same syllabus, three outcomes

Written for faculty and campus IT who are comparing a general chatbot, a tool that mainly grades quizzes, and a teaching layer that sits beside the LMS. It covers product shape and control, not pricing sheets or unpaid vendor rankings. Memory stores, campus SSO catalogs, and full HECVAT packets live elsewhere; they appear here only when they change the teaching outcome.

## Quick grasp

**What.** Three stacks can touch the same syllabus. A general chatbot answers from the open web. An AI quiz grader scores submitted answers. A teaching layer turns materials into draft courses, tutors from that course only, assesses in ways that are hard to game, grades with an audit trail, and shows what to reteach. SOL is the third shape.

**Why it matters.** Teams often buy the first tool that demos well, then discover the gap at week three: the tutor invents a reading that was never assigned, grades arrive without a paper trail, or the LMS still owns everything that matters and the new tool never joined the loop.

**How, in four steps.**

1. Name the job you actually need this term (draft from files, tutor in scope, grade with review, or replace the LMS).
2. Run one concrete ticket through each stack (Level 0).
3. Read which facts survive: course scope, instructor approval, auditability.
4. Use the decision guide. Pick the stack that keeps the facts you must keep.

**When to care.** The moment you are evaluating “AI for teaching” and the shortlist mixes ChatGPT, a grader plugin, and a platform that claims to replace Canvas.

**Important:** Fewer features is not the goal. The goal is that by midterm, students only see what you released, tutors answer from your materials, and every contested grade has a path back to rubric criteria you can defend.

## The level tree

- **Level 0:** one ticket, three stacks.
- **Level 1:** the market map (four product families).
- **Level 2:** where SOL wins on clear axes.
- **Level 3:** where ChatGPT or the LMS still wins.
- **Level 4:** Say / Avoid for campus conversations.
- **Level 5:** decision guide, takeaways, references.

## Level 0: One ticket, three stacks

This level answers: what happens to the same faculty job under each default.

**The ticket.** An instructor has a 28-page PDF of notes for Week 4. They need: a draft lesson and practice set, a short-answer quiz that follows up on each student’s own answer, a place students can ask for help without drifting to Wikipedia, grades they can explain, and a signal of which concept to reteach next week.

**Stack A: general chatbot (ChatGPT-shaped).** Paste excerpts into a chat. Ask for a lesson outline and quiz items. Paste student answers later for a suggested score. The model is helpful and fast. It does not know which PDF is authoritative for *this* section. It may invent a secondary source. Nothing is enrolment-gated. Nothing waits in an Attention queue. Nothing writes an institutional audit row. The LMS remains the system of record for roster and grades unless someone copies scores by hand.

**Stack B: AI quiz grader.** Upload or paste a quiz. Students submit. The model returns scores. Some products show a rationale. Many stop there. There is little or no authoring from the syllabus, no course-scoped tutor, no concept-level reteach view across the term. If the score is wrong, the instructor overrides in a gradebook field with thin history.

**Stack C: SOL teaching layer.** Upload materials for the course. Wait until status is Ready. Author a draft outline from those materials. Edit in chat. Publish inactive, then release. Students use a course tutor grounded only in indexed materials. Open responses return rubric matches; application code computes the score; unsure items wait in Attention. Concept tags feed analytics for reteaching. Students enroll with a learner code. Faculty stay grader of record.

**What it means:** Stack A wins on blank-page speed and open-ended brainstorming. Stack B wins when the only job is scoring a fixed quiz bank. Stack C wins when the job is the whole loop with course scope and audit. Buying A or B and hoping they become C is the common failure.

**Carry forward:**

- Judge tools on one midterm-shaped ticket, not a homepage demo.
- Ask what is in the tutor’s retrieval set, and what happens to an unsure grade.
- Ask whether students can see drafts before you release them.

## Level 1: The market map

This level answers: which family you are actually buying.

| Family | Typical promise | Typical gap |
| --- | --- | --- |
| General chatbot | Answers anything | No course authority, no roster, no audit |
| Quiz / homework AI grader | Faster scoring | Thin authoring, weak tutoring, weak reteach loop |
| AI teaching layer (SOL) | Materials → tutor → assess → grade → see | Not an LMS; LTI optional |
| Full LMS replacement | One system for everything | Migration cost; SOL does not claim this |

SOL’s public positioning is deliberate:

| Say | Avoid |
| --- | --- |
| Teaching layer for your LMS | “Replaces Canvas” |
| You approve; SOL drafts and suggests | “SOL automatically knows” |
| Course-scoped tutor | Generic chatbot for the class |
| Built for Canvas (LTI when enabled) | Live sync as shipped without `LTI_ENABLED` |

**Carry forward:**

- If the vendor leads with “replaces your LMS,” that is a different purchase than SOL.
- If the vendor only demos a score on a short answer, ask where lessons, tutor, and analytics live.

## Level 2: Where SOL wins

This level answers: the axes that are not marketing gloss.

1. **Course scope.** Tutors and discussion bots answer from materials you indexed for that course, not the open web. That is the difference between “help with *my* Week 4” and “help with the internet’s Week 4.”
2. **Release control.** Drafts stay hidden until you release. Students do not see a model’s first pass.
3. **Grading path.** Model returns rubric criterion matches. Code computes the numeric score. Unsure work waits for you. You can adjust every score. That is grader-of-record design, not black-box auto-grade.
4. **Full loop.** Materials, authoring, assignments, tutor, Attention, analytics. Grading is one pillar, not the product.
5. **Records posture.** Rosters, attempts, and gradebooks sit behind authentication. Public docs and `llms.txt` describe the product; they do not expose education records.

**Carry forward:**

- SOL wins when scope, release, and audit are requirements, not nice-to-haves.
- Demo those three before feature count.

## Level 3: Where the others still win

This level answers: honest non-goals so the comparison stays credible.

**ChatGPT (or any general assistant) still wins when:**

- You need a one-off brainstorm with no student roster.
- You are drafting personal teaching notes offline and will paste the result into the LMS yourself.
- The institution forbids any third-party education-record processor and you will only use AI on de-identified snippets you paste by hand.

**A quiz-only grader still wins when:**

- The course already has a stable quiz bank and the only bottleneck is scoring volume.
- You do not want authoring, tutoring, or analytics in the same product.

**The LMS still wins (and should) when:**

- Official roster, SIS sync, and institutional grade submission are the system of record.
- Accessibility, content repositories, and campus templates already live there.

SOL is designed to sit beside that LMS. Canvas LTI (launch, roster, grade passback) is available when your deployment sets `LTI_ENABLED=true` and configures the connector. Do not claim live Canvas sync for a site that has not enabled it.

**Carry forward:**

- A credible VS post names losses. SOL loses at “blank chat with no course” and “replace Canvas entirely.”
- Buy the LMS job from the LMS. Buy the teaching-layer job from a teaching layer.

## Level 4: Say / Avoid in the room

| Conversation | Prefer | Avoid |
| --- | --- | --- |
| Faculty senate | “Instructors approve; SOL drafts” | “AI teaches the course” |
| Campus IT | FERPA-minded records, Attention, audit log, HECVAT on request | “We never touch student text” (tutors and grading may send minimized text under no-train / ZDR controls) |
| Students | “Help from your course materials” | “A chatbot for homework” |
| Procurement | Teaching layer + optional LTI | LMS replacement RFP language |

## Decision guide

| If you need… | Prefer |
| --- | --- |
| Fast personal brainstorming with no roster | General chatbot |
| Score a fixed quiz bank only | Quiz-focused grader |
| Draft from syllabus, tutor in scope, audit grades, see gaps | SOL teaching layer |
| Official campus gradebook and SIS | Your LMS (optionally link SOL via LTI when enabled) |
| Public marketplace of courses | Not SOL (enrolment is by codes) |

## Takeaways

- Same syllabus, three outcomes: chat invents freely, graders score narrowly, a teaching layer keeps course scope and release control.
- SOL wins on scope, approval, audit, and loop completeness. It does not win as an LMS replacement or as an unbounded chatbot.
- Evaluate with one midterm-shaped ticket. Ask what the tutor can retrieve and what happens to an unsure grade.
- Canvas remains the LMS you already run. SOL attaches when you choose; LTI is opt-in.

## References

- [About SOL](/docs/about-sol)
- [Course materials](/docs/professor-materials)
- [Authoring from materials](/docs/professor-authoring)
- [Grading and Attention](/docs/professor-grading)
- [Security](/security)
- [Canvas LTI setup](/docs/canvas-lti)
- Marketing home: [teachwithsol.com](https://www.teachwithsol.com)
