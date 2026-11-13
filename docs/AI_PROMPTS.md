# SOL AI prompts (v2)

**PROMPT_VERSION=`2026-11-05.1`**

Canonical modules live under [`lib/ai/prompts/`](../lib/ai/prompts/). Every JSON agent prepends `SOL_COMMON`. The live tutor uses a separate assemble path (no `SOL_COMMON` JSON clause).

## Placeholders

| Placeholder | Source | Default |
|---|---|---|
| `{{course_subject}}` | `courses.subject` | `General` |
| `{{course_level}}` | `courses.level` | `undergraduate` |
| `{{feedback_tone}}` | `courses.feedback_tone` | `supportive` |
| `{{course_title}}` | `courses.title` | `this course` |
| `{{authoring_policy}}` | `authoring_policies` + format helper | `None specified.` |
| `{{rubric_style}}` | policy `rubricStyle` | clear observable criteria… |
| `{{assessment_lock_line}}` | assessment lock when student has active attempt | empty when unlocked |
| `{{prompt_version}}` | `PROMPT_VERSION` | `2026-11-05.1` |
| `{{k_min}}` | insights privacy floor | `5` |

Instructors can patch subject / level / feedback tone via `PATCH /api/professor/courses/[courseId]/settings`.

## Agents

| Agent | Module | Notes |
|---|---|---|
| Grader | `grader.ts` | `met\|partial\|not_met`; confidence **0–1** → store **0–100**; injection = ignore instruction, grade substance |
| Rubric designer | `rubric.ts` | samples + `needs_instructor_input`; approve gate before grade |
| Tutor | `tutor.ts` | rules → FERPA/distress → mode → instructor → materials; assessment lock line |
| Struggle tagger | `struggleTagger.ts` | async after session complete |
| Authoring (skeleton/build/refine/switch-up) | `authoring.ts` | skeleton → approve → strong builder; `unsupported_facts` |
| Reviewer | `review.ts` | expanded flag set + severities |
| Insights | `insights.ts` | pre-aggregated criterion miss rates; drop groups with `n < k_min` |

## Rubric approval

- Existing non-null rubrics were backfilled to `rubric_status='approved'` (migration `0058_ai_prompts_v2`).
- New drafts stay `proposed` until instructor approve (+ sample separation).
- At grade time: `proposed` / `rejected` → `manual_review` (no silent score).

## Outline path

Keep **skeleton → approve → strong builder**. Do not revive one-shot full bodies under the outline generator name.
