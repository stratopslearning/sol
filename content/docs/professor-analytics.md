---
title: Course analytics
description: Concept mastery gaps from tagged quiz questions and lesson completion for courses you teach.
audience: faculty
order: 5
---

# Course analytics

**Analytics** shows course-level signals computed live from existing data (no separate mastery warehouse):

1. **Concept mastery**: for each concept tag on quiz questions in sections you teach, success rate across submitted attempts you can see. Concepts under **60%** success are flagged as gaps. Questions without tags are excluded; **tag coverage** shows how many questions are tagged.
2. **Lesson completion**: for active lessons assigned to your sections, share of the active roster who never started / started / completed.

Use gaps to decide what to reteach. Use lesson rates to see who has not opened released materials.

## How to use it

1. Open **Analytics** and pick a course
2. Optionally filter to one section
3. Cross-check weak concepts against your materials and released lessons
4. Follow up with a short reteach quiz or discussion if needed

Tags come from **Authoring** when quizzes are generated. Untagged hand-built quizzes will not appear in the concept table until tags exist.

## Agents

Via Agent Access (MCP, `read` scope): `get_concept_mastery` and `get_lesson_completion`, or `GET /api/professor/analytics?courseId=…`.

## Related guides

- [Authoring from materials](/docs/professor-authoring)
- [Grading and Attention](/docs/professor-grading)
- [Agent Access](/docs/professor-agent-access)
