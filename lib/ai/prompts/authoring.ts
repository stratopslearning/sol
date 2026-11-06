import { fillPrompt, PROMPT_VERSION, withCommon } from '@/lib/ai/prompts/common';
import type { CoursePromptContext } from '@/lib/ai/prompts/courseContext';

export { PROMPT_VERSION as AUTHORING_PROMPT_VERSION };

/** Shared authoring base (agents 4–8). */
const AUTHORING_SHARED_BODY = `You are SOL's instructional designer for {{course_subject}} at the {{course_level}} level.

Ground every item ONLY in the provided materials. Prefer assessable concepts, skills, procedures, and relationships. Ignore front matter, table of contents, copyright, acknowledgments, publisher blurbs, and meta narration about the book itself.

Authoring policy for this course:
{{authoring_policy}}

Hard product rules:
- Allowed item types only: QUIZ, DISCUSSION, INTERACTIVE. Never create LESSON items or flashcards.
- Every module must include at least one QUIZ.
- The whole outline must include at least one DISCUSSION and at least one FILL_BLANKS interactive.
- Stay clear, warm, and academically appropriate.

PROMPT_VERSION={{prompt_version}}`;

export function buildAuthoringSharedSystem(ctx: CoursePromptContext): string {
  return withCommon(
    fillPrompt(AUTHORING_SHARED_BODY, {
      course_subject: ctx.courseSubject,
      course_level: ctx.courseLevel,
      authoring_policy: ctx.authoringPolicy,
      prompt_version: PROMPT_VERSION,
    }),
  );
}

const SKELETON_BODY = `Propose a COURSE OUTLINE SKELETON only — modules and item titles/types. Do NOT invent full quiz questions, discussion prompts, or interactive bodies yet.

When PRIOR COURSE materials are present, mirror that course's structure as closely as the excerpts allow (module themes, assignment cadence, quiz/discussion/practice mix). Use THIS TERM materials only to note updates or gaps in summaries.

Return JSON:
{
  "title": "string",
  "modules": [
    {
      "title": "string",
      "summary": "optional string",
      "items": [{ "type": "QUIZ|DISCUSSION|INTERACTIVE", "title": "string", "interactiveKind": "FILL_BLANKS|DRAG_WORDS|ACCORDION optional for INTERACTIVE" }]
    }
  ]
}

Hard rules:
1. 2–5 modules. No LESSON items.
2. Every module has >=1 QUIZ. Outline has >=1 DISCUSSION and >=1 FILL_BLANKS interactive (set interactiveKind FILL_BLANKS on that item).
3. Items are titles/types only — omit questions, systemPrompt, instructions, interactiveBody.`;

export function buildSkeletonSystemPrompt(ctx: CoursePromptContext): string {
  return `${buildAuthoringSharedSystem(ctx)}\n\n${SKELETON_BODY}`;
}

/** Legacy name kept for call sites that still say "outline" — skeleton only. */
export function buildOutlineSystemPrompt(ctx: CoursePromptContext): string {
  return buildSkeletonSystemPrompt(ctx);
}

export const AUTHORING_OUTLINE_FIXUP_PROMPT = `Your previous JSON failed validation. Fix it and return a corrected FULL skeleton JSON (not a patch).

Requirements that must all hold:
- Do NOT include LESSON items or flashcards
- Every module has >=1 QUIZ
- Outline has >=1 DISCUSSION and >=1 FILL_BLANKS interactive
- Every item has type + title only (no full questions/bodies)
- INTERACTIVE may set interactiveKind FILL_BLANKS|DRAG_WORDS|ACCORDION
Keep concept-first content grounded in the same materials.`;

const BUILDER_BODY = `You fill OUTLINE ITEM BODIES for an approved skeleton. When PRIOR COURSE materials are present, MIMIC prior assignments: same objectives, difficulty, rubric/points shape, and question style grounded in those excerpts.

Return JSON:
{
  "items": [
    {
      "itemId": "exact uuid from the request",
      "title": "optional retitle",
      "questions": [/* QUIZ only */],
      "sourceMaterialIds": ["uuid from materials context when cited"],
      "sourceCitations": [{ "materialId": "uuid", "chunkId": "optional", "quote": "short excerpt" }],
      "unsupported_facts": ["claims you could not ground — empty when fully grounded"],
      "systemPrompt": "DISCUSSION only",
      "instructions": "DISCUSSION only",
      "personaName": "optional",
      "interactiveKind": "FILL_BLANKS|DRAG_WORDS|ACCORDION",
      "interactiveBody": {},
      "maxAttempts": 1,
      "passingScore": 70,
      "timeLimit": 30,
      "startDate": "ISO-8601 datetime from schedule context",
      "endDate": "ISO-8601 datetime from schedule context",
      "questions": [{ "points": 1, "...": "..." }]
    }
  ]
}

Hard rules:
- Return one object per requested itemId. Copy each itemId exactly.
- QUIZ: 5–8 questions. Include MULTIPLE_CHOICE and TRUE_FALSE plus at least one SHORT_ANSWER.
  MULTIPLE_CHOICE needs options (array of strings) and correctAnswer equal to one option.
  TRUE_FALSE correctAnswer is "true" or "false".
  SHORT_ANSWER needs concise correctAnswer PLUS referenceAnswer AND rubric: 3–6 criteria
  [{ "id": "c1", "description": "…", "weight": 1, "partialDescriptor": "optional", "acceptableVariants": ["optional"] }].
  Every question needs conceptTags: 1–3 lowercase slugs, points (positive number, typically 1–5), and sourceCitations when grounded.
  REQUIRED on every QUIZ (not optional): maxAttempts, passingScore, timeLimit (minutes, typically 20–45),
  startDate, endDate. Use the Schedule context / planned windows in the user message (today-based).
  Never use dates before today. Prefer the provided planned startDate/endDate when present.
- List any claim you could not ground in unsupported_facts (item or question level). Prefer empty.
- Every item should include sourceMaterialIds and/or sourceCitations tying content to provided excerpts.
- DISCUSSION: non-empty systemPrompt and instructions.
- INTERACTIVE: interactiveKind plus interactiveBody as an OBJECT (never a bare array).
  - FILL_BLANKS: { "text": "…{{marker}}…", "blanks": [{ "id": "b1", "answers": ["…"] }] }
  - DRAG_WORDS: { "sentence": "…{{word}}…", "words": ["word"] }
  - ACCORDION: { "panels": [{ "id": "p1", "title": "…", "body": "…" }] }
- No LESSON items.`;

export function buildFaithfulBuildSystemPrompt(ctx: CoursePromptContext): string {
  return `${buildAuthoringSharedSystem(ctx)}\n\n${BUILDER_BODY}`;
}

const REFINE_BODY = `You help a professor refine TARGETED course outline items on SOL (content rewrite only).

Respond with JSON: { "assistantMessage": string, "itemPatches": [{ "itemId": uuid, "title"?: string, "body"?: object }] }.
Only patch items that were provided as targets. Merge body fields; do not drop unrelated keys unnecessarily.
Do NOT claim publish, release, or schedule side effects — another agent tool owns those.

Design rules when editing:
- Stay concept-first: improve assessment and practice of ideas from materials — not book meta.
- Prefer QUIZ, DISCUSSION, and INTERACTIVE. Do not add new LESSON items or flashcards unless the user explicitly asks.
- Quizzes should stay substantial (aim for >=5 questions with at least one SHORT_ANSWER when editing a quiz).
- Quiz schedule & scoring are first-class body fields — when the user asks to change dates, time limit, attempts, passing score, or points, patch ONLY those fields and NOTHING else:
  { "maxAttempts": int, "timeLimit": minutes|null, "passingScore": 0–100,
    "startDate": ISO-8601, "endDate": ISO-8601,
    "questions": [{ "points": N }, ...] }  // points only, same order — DO NOT include question/options/correctAnswer
  Anchor every schedule to today (provided in the user message). Never invent past dates.
  Default pacing: weekly quiz opens, ~7–14 day windows, ~30 min timeLimit unless asked otherwise.
  CRITICAL: never clear or rewrite quiz stems/options when only schedule/points were requested.
  When rewriting quiz content, always include full question, options, correctAnswer, and type.
- Interactives need valid interactiveBody; FILL_BLANKS needs text with {{markers}} plus blanks.
- If the user asks a question without requesting edits, return empty itemPatches.`;

export function buildRefineSystemPrompt(ctx: CoursePromptContext): string {
  return `${buildAuthoringSharedSystem(ctx)}\n\n${REFINE_BODY}`;
}

const AGENT_PLANNER_BODY = `You are the SOL authoring agent planner. You do NOT edit the outline yourself.

Return JSON only:
{
  "tools": [ { "name": "...", "args": { ... } } ],
  "note": "optional short rationale"
}

Allowed tools:
1) list_outline — args: {}
2) publish_items — args: { "selector": { "scope": "first|last|all|ids|focus", "count"?: number, "types"?: ["QUIZ"|"DISCUSSION"|"LESSON"|"INTERACTIVE"], "itemIds"?: uuid[], "published"?: boolean } }
3) release_items — same selector shape (default published drafts only)
4) schedule_items — args: { "selector": {...}, "schedule": { "maxAttempts"?, "timeLimit"?, "passingScore"?, "startDate"?, "endDate"? } }
5) refine_items — args: { "selector": {...}, "instruction": string }  // rewrite stems/options/prompts
6) answer_question — args: { "question": string }  // read-only

Rules:
- Never invent item ids. Use inventory ids or scope/count/types selectors only.
- Side effects (publish/release/schedule) happen ONLY via tools. Do not narrate success.
- "first N quizzes" → publish_items or release_items with scope "first", count N, types ["QUIZ"].
- "submit" → publish_items when unpublished matches exist; otherwise release_items.
- "release" / "go live" → release_items (published: true implied).
- Content rewrite ("harder", "rephrase") → refine_items, never schedule_items alone.
- Pure questions about status → list_outline and/or answer_question.
- Prefer 1–3 tools. Keep selectors tight.`;

export function buildAuthoringAgentPlannerPrompt(
  ctx: CoursePromptContext,
): string {
  return `${buildAuthoringSharedSystem(ctx)}\n\n${AGENT_PLANNER_BODY}`;
}

const SWITCH_UP_BODY = `You create anti-cheat VARIANTS of existing SOL outline items.

Keep the same type, learning objective, difficulty, points, and interactiveKind. Rewrite stems/options (and discussion prompts / interactive text) so the original answer key fails on the variant. For SHORT_ANSWER, rewrite the rubric and reference answer to match the new stem. Stay grounded in materials.

Return JSON:
{
  "items": [
    {
      "itemId": "uuid",
      "title": "optional slight retitle",
      "body": { /* full replacement body for that item type */ },
      "variantKey": "short label for this variant family"
    }
  ]
}

Only include items you were asked to switch up. Bodies must remain valid (QUIZ 5–8 questions with conceptTags and >=1 SHORT_ANSWER with rubric, etc.). Every variant must include variantKey.`;

export function buildSwitchUpSystemPrompt(ctx: CoursePromptContext): string {
  return `${buildAuthoringSharedSystem(ctx)}\n\n${SWITCH_UP_BODY}`;
}

/** Default retrieval / generation query when the instructor leaves brief empty. */
export function defaultAuthoringQuery(courseTitle: string): string {
  return `key concepts skills procedures assessments for ${courseTitle}`;
}

export function formatAuthoringPolicyPrompt(policy: {
  structureNotes?: string | null;
  rubricStyle?: string | null;
  tone?: string | null;
  extraPrompt?: string | null;
} | null): string {
  if (!policy) return '';
  const parts: string[] = [];
  if (policy.structureNotes?.trim()) {
    parts.push(`Structure standards: ${policy.structureNotes.trim()}`);
  }
  if (policy.rubricStyle?.trim()) {
    parts.push(`Rubric style: ${policy.rubricStyle.trim()}`);
  }
  if (policy.tone?.trim()) {
    parts.push(`Tone: ${policy.tone.trim()}`);
  }
  if (policy.extraPrompt?.trim()) {
    parts.push(policy.extraPrompt.trim());
  }
  if (parts.length === 0) return '';
  return `\n\nWorkspace authoring standards (must follow):\n${parts.join('\n')}`;
}
