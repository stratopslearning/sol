---
title: "The model matched the rubric; code scored it; you still own the grade"
description: "How SOL turns rubric matches into scores, when Attention holds an answer, and why campus IT should care about grader-of-record design versus black-box auto-grade."
audience: both
kind: product
order: 2
date: 2026-10-28
---

# The model matched the rubric; code scored it; you still own the grade

Written for faculty who will be asked “who graded this?” and for campus IT reviewing AI scoring. It covers the path from student text to a number in the gradebook inside SOL. It does not cover model vendor contracts line by line; see Security for FERPA-minded posture and subprocessors.

## Quick grasp

**What.** In SOL, the model proposes which rubric criteria an open response matches. Application code turns those matches into a numeric score. Low-confidence or blocked cases wait in Attention for a human. You can change any score. That design is “grader of record,” not “the model is the grade.”

**Why it matters.** Black-box auto-grade products return a number. When a student appeals, you need criterion-level history, not a shrug. When IT asks whether student text leaves the campus trust boundary, you need a clear story about minimization, no-train / ZDR configuration, and audit logs.

**How, in four steps.**

1. Separate match (model) from score (code).
2. Know what lands in Attention and who clears it.
3. Confirm overrides are first-class, not a spreadsheet side channel.
4. Ask IT to read Security before enabling wide pilots.

**When to care.** Any pilot that will put contested grades in front of students or registrars.

**Important:** A confident model tone is not evidence. The evidence is the rubric match list, the computed score, and the Attention or override trail.

## The level tree

- **Level 0:** one open response, end to end.
- **Level 1:** match vs score vs Attention.
- **Level 2:** what SOL refuses to pretend.
- **Level 3:** campus IT checklist.
- **Level 4:** decision guide, takeaways, references.

## Level 0: One open response

This level answers: what a faculty member can show on appeal.

A student submits a short answer. SOL sends minimized student text plus rubric context to the grading path (see Security for AI and retention posture). The model returns criterion matches. Code computes the score from those matches. If confidence is low or policy requires review, the item waits in Attention. The instructor opens Attention, reads the match trail, accepts, adjusts, or regrades. The gradebook shows the result students are allowed to see once released.

Compare a black-box grader: paste answer, receive 8/10, thin or no criterion map, override is a typed number with no structured history.

**Carry forward:**

- On appeal, open the attempt page and the Attention history, not a chat transcript with the vendor.
- If a product cannot show criterion matches, treat it as opaque.

## Level 1: Match, score, Attention

This level answers: which component owns which failure mode.

| Stage | Owner | Failure if skipped |
| --- | --- | --- |
| Rubric matches | Model | Wrong criteria highlighted |
| Numeric score | Application code | Model invents a total you cannot recompute |
| Unsure / blocked | Attention queue | Bad grades ship silently |
| Final judgment | Instructor | No grader of record |

SOL’s product copy is intentional: scores are computed in application code from rubric criterion matches. Model output alone is not trusted as a raw numeric grade.

**Carry forward:**

- Demand “match then score,” not “score then vibes.”
- Attention is a feature, not a bug queue to hide.

## Level 2: What SOL refuses to pretend

This level answers: honesty that keeps trust.

- SOL does not claim the model “knows” the right grade without you.
- SOL does not claim student work is never processed by an AI subprocessor when short-answer grading or tutors run. It claims minimization, role gating, and production configuration that disables training on customer content with strong no-retention options where available.
- SOL does not replace the LMS gradebook of record for the institution unless you deliberately integrate (for example Canvas AGS when LTI is enabled).

**Carry forward:**

- Overclaiming privacy or autonomy is how pilots die in committee.
- Point IT at Security and the grading docs before the demo glow fades.

## Level 3: Campus IT checklist

| Ask | Healthy answer in SOL’s shape |
| --- | --- |
| Who is grader of record? | The instructor; Attention + overrides |
| Can we see criterion-level rationale? | Yes on attempt / review surfaces |
| What is logged? | Privileged actions to an append-only audit log |
| Is there a public grade API? | No; education records stay behind auth |
| HECVAT? | Lite packet available in contracting |

**Carry forward:**

- Put these five questions in the RFP. Tools that cannot answer them are not ready for contested grades.

## Decision guide

| If you need… | Prefer |
| --- | --- |
| Fast suggestive scores with no audit | A lightweight chatbot workflow (not for official grades) |
| Official, appealable grades with AI assistance | SOL-style match → code score → Attention |
| SIS grade submission only | Your LMS (link later via LTI if enabled) |

## Takeaways

- Grader of record means a human can defend every number from criteria, not from model confidence.
- Separate match from score. Keep unsure work in a queue.
- Security and grading docs are part of the product story, not an appendix.

## References

- [Grading and Attention](/docs/professor-grading)
- [Security](/security)
- [About SOL](/docs/about-sol)
- [Faculty onboarding](/docs/professor-onboarding)
