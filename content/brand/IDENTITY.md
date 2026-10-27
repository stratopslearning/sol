# SOL Brand Identity

Instructions for Cursor: when building or editing any SOL UI, copy, email, or marketing page, follow this file. Prefer design tokens (CSS variables in `app/globals.css`) over hard-coded colors. If a request conflicts with this file, say so and ask.

## 1. Brand in one paragraph

SOL is the AI teaching layer for the LMS universities already use, starting with Canvas. It is not “an AI quiz grader.” It turns an instructor’s own materials into courses, practice, and quizzes (the instructor edits in chat and approves before students see anything), gives students a tutor grounded only in that course’s materials, grades with auditable rubrics, runs assessments that are hard to game, and shows instructors concept-level gaps and weak questions. The brand should feel like a warm, sharp teaching assistant: calm, clear, a little bit of light in a busy semester. It is not a robot, not a classroom cartoon, and not enterprise gray.

The idea behind the name: Sol means sun. A sun doesn’t do the work for you; it lets you see. SOL’s job is the same: show instructors where students are, and show students where to go next.

**Positioning line:** The AI teaching layer for the LMS you already use.

**Tagline (canonical):** The operating system for learning.

**Brand phrase (warm / display):** Teaching, in a better light.

## 2. What SOL does (product truth)

Lead with the full loop, not grading alone:

1. **Build**: Turn syllabus or notes into a draft course: lessons, practice, quizzes. Edit in chat. Approve before students see anything.
2. **Tutor**: Students get help grounded only in that course’s materials.
3. **Assess**: Randomized variants, follow-ups about a student’s own answer, AI-evaluated discussions. Hard to game.
4. **Grade**: Model returns rubric matches only; code computes the score; unsure answers go to manual review.
5. **See**: Concept-level gaps and weak questions, so faculty know what to reteach.

Grading is one pillar. Do not describe SOL as “a grading platform,” “an AI quiz tool,” or lead every surface with short-answer scoring.

## 3. Personality

| We are | We are not |
| --- | --- |
| Warm, plain-spoken, steady | Chirpy, gimmicky, "supercharged" |
| Precise and honest about what AI can and can't do | Hype-driven ("revolutionary", "magic") |
| On the instructor's side, always in their control | Replacing the instructor |
| Curious and a little playful in practice moments | Childish in graded or serious moments |
| Quietly confident | Loud or salesy |

Three words to design and write by: **clear**, **warm**, **trustworthy**.

## 4. Voice and writing rules

- Say it plainly. Short sentences, everyday words. A busy professor reads this between classes.
- Lead with what the person can do or see, not with the technology. Say "See which concepts your class missed", not "AI-powered analytics".
- Be honest about AI. Say "SOL suggests" and "you review", not "SOL automatically knows". Instructors approve; SOL drafts.
- Explain grades, never just state them. Every score shows the rubric points it came from.
- Encourage learners without gushing. Specific and kind beats cheerful and vague.
- No filler hype words: revolutionary, game-changing, supercharge, unlock, seamless, cutting-edge, leverage, next-gen.
- Use "AI" sparingly. One mention where it matters is enough.
- Sentence case everywhere (buttons, headings, nav). No ALL CAPS except the wordmark.
- No em dashes. Prefer periods, commas, or colons.
- Errors are calm and useful: say what happened, then what to do next. Never blame the user.

### Microcopy examples

| Moment | Use | Avoid |
| --- | --- | --- |
| Empty course | "Add your syllabus or notes and SOL will draft a first version. You stay in control." | "Let's unleash the power of AI!" |
| Draft ready | "Draft ready. Review it, change anything, then publish." | "Your course has been magically generated!" |
| Grading in progress | "Grading your short answers. This usually takes a minute." | "Processing..." |
| Grade shown | "7 of 10. You covered 3 of the 4 rubric points. Missing: why the reaction is exothermic." | "Score: 7" |
| Low confidence | "SOL wasn't sure about this answer, so it's waiting for your review." | "Error: low confidence." |
| Student follow-up | "Quick check: how did you get to that answer?" | "Prove you didn't use AI." |
| Canvas sync (when shipped) | "Grades sent to Canvas." | "Sync successful!" |
| Error | "We couldn't reach Canvas. Your grades are saved, and we'll retry in a few minutes." | "Something went wrong." |
| Tutor | "I can only answer from this course's materials. Here's what they say about that." | "As an AI language model..." |

**Product honesty:** You may say “Built for Canvas” and describe LTI launch / roster / grade passback. Claim live sync or “works inside Canvas” only for deployments with `LTI_ENABLED=true` and a configured developer key. Prefer “when your institution enables the Canvas connector.” Keep sync success/error lines as microcopy patterns.

### Audience tones

- **Instructors and admins:** professional, efficient, respectful of their expertise.
- **Learners:** friendly, encouraging, never condescending.
- **Buyers (marketing):** concrete outcomes and proof (time saved, pass rates), not slogans.

## 5. Typography

| Use | Font | Weights | Notes |
| --- | --- | --- | --- |
| Display / headlines (app + marketing) | Instrument Serif | 400 (+ italic) | Canonical display face; see `design.md`. |
| Body / UI (app + marketing) | Geist Sans, with Inter / Manrope / Instrument Sans fallbacks | 400–600 | Warm, readable sans. |
| Rubrics, scores, code, IDs | JetBrains Mono | 400, 500 | Signals auditable and precise. |

Scale (rem, line-height):

- Display: 3 / 1.1 (marketing hero only)
- H1: 2 / 1.15
- H2: 1.5 / 1.25
- H3: 1.25 / 1.3
- Body: 1 / 1.6 (16px minimum, never smaller for body)
- Small: 0.875 / 1.5
- Caption: 0.75 / 1.4 (labels only)

Max line length for reading text: 68 characters. Headlines use sentence case and `text-wrap: balance`.

## 6. Color and visual system

Marketing / auth visual design (palette, paintings, layout, motion) lives in [`design.md`](./design.md). Use CSS variables in `app/globals.css` (especially under `.mkt`). Do not invent new hard-coded hex values in UI.

## 7. Marketing labels

On marketing surfaces prefer **faculty** and **learners**. In-app roles may still say Professor / Student where the product role requires it.
