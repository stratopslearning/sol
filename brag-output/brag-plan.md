# Brag Plan: SOL

## What is this app?
SOL is an academic LMS where professors write quizzes and hand off the grading — multiple choice is instant, and short/long answers are scored by AI with reasoning the professor can read, challenge, and override.

## The angle
The red pen is the enemy. Every professor knows the weekend that gets eaten grading a stack of short-answer responses. SOL's pitch isn't "AI grading" as a buzzword — it's *relief*, delivered with the product's own quiet, editorial voice: "Build the quizzes. Let AI grade the hard ones." The video shows the actual moment that sells it — a subjective answer getting a score **with visible reasoning** — and lands on the human staying in charge: "You stay the grader of record." Specific to SOL because it leans on SOL's real copy and its warm-paper, deep-green, Fraunces-serif identity, not generic edtech gloss.

## Hook (first 2-3 seconds)
A red-pen grading scrawl on warm paper — "12/20", a circled "?", a weary check — then a beat, then it clears. Text: **"Grading short answers ate your weekend."** It's the pain, stated plainly, in the product's own deadpan-warm register. Earns the next 18 seconds because every professor recognizes it instantly.

## Key moments (the middle)
- **The wordmark reveal** — SOL resolves on paper: "Build the quizzes. / Let AI grade the hard ones." (the real hero headline, verbatim).
- **The centerpiece — a subjective answer being graded.** A short-answer question card, a student's typed response, then an AI **score chip (8/10)** lands *with a line of reasoning* underneath. This is the product doing its actual job.
- **Human stays in charge.** The reasoning line gets a professor's cursor + an "Override" affordance — "You stay the grader of record. The model does the first pass." (verbatim from the site).
- **Gradebook glance** — best-scores grid fills in per student/section, reinforcing "every attempt, auditable."

## Outro / punchline
Wordmark + the FeatureGrid line, verbatim: **"Less time grading. More time teaching."** Clean hold on SOL Optional soft final swell.

## User flow worth showing
Entry → key action → result, from the real app:
1. A quiz question card (short-answer) with a student's typed response — the thing being graded.
2. AI scores it: a score chip appears **with rubric-aligned reasoning** underneath (the core action — `lib/grading.ts`).
3. Professor reviews: reasoning is readable, an Override control is present; gradebook updates. This is SOL's actual differentiator, not a marketing bullet.

## Tone
- Preset: polished
- Creative direction: a quiet, editorial product film for professors — warm paper, red-pen relief, serif confidence.
- Interpretation: fewer scenes, longer holds, restrained motion. Confidence through calm. One dry accent per beat, never busy. The wit comes from the honest "ate your weekend" framing, delivered straight — not from jokes.
- Cinematic pass: read as an *editorial film*, not motion graphics. A lighting arc carries the emotion (lamp-dark dread → daylight relief); one slow, singular camera move per scene (push-in / static hold / rack focus — never two in one scene); subtle film grain + soft vignette as a consistent global texture. Shallow depth of field in scenes 1 & 3 (supports the push-in and rack focus); flatter, even light in the wordmark cards (scenes 2 & 5).

## Format: landscape — 1920x1080
## Duration: ~22 seconds (4 + 3 + 7 + 4 + 4)

## Global treatment (all scenes)
- Subtle, static (or barely-drifting) film grain + soft vignette across every scene — consistent editorial texture, not a per-scene effect.
- One slow camera move per scene, never combined: push-in (S1), static hold (S2), push-in → rack focus (S3), static (S4), static (S5).
- Lighting arc: warm low-key lamp (S1) → clean, even daylight by S3, held through the end. The light mirrors dread → relief.

## Visual identity (from the project)
- Background: `oklch(0.985 0.004 85)` — warm paper (`--paper`)
- Accent (brand): `oklch(0.42 0.075 162)` — deep pedagogical green (`--brand`)
- Secondary accent: `oklch(0.62 0.135 38)` — terracotta (`--accent`); red-pen uses `--danger` `oklch(0.55 0.18 25)`
- Text: `oklch(0.22 0.012 60)` — warm near-black ink (`--ink`); muted `oklch(0.45 0.01 60)`
- Rule/hairline: `oklch(0.9 0.006 85)` (`--rule`)
- Display font: Fraunces (serif, optical-size + SOFT/WONK axes) — set headings with `opsz` high, tight `-0.035em` tracking
- Body font: Instrument Sans; numerals/labels: JetBrains Mono
- Strongest visual element: the AI **score chip + reasoning** on a quiz card (the grading moment); the Fraunces hero headline; the hairline-ruled, paper-and-green editorial layout.

## Share copy (draft)
The weekend you used to spend grading short answers? SOL gives it back — AI scores the subjective questions *with reasoning you can override*, and you stay the grader of record. Built with @hyperframes.

## Audio direction
- Role: an **unscored cold open** (S1), then a warm, restrained editorial bed from the cut to S2 onward, with 2-3 very subtle SFX. Present, never busy.
- Cold open (S1, 0:00–0:04): **no music.** A barely-audible room-tone / lamp-hum under the first ~3s of stillness, then a single soft pen/paper-contact SFX as the pen touches the paper at ~3.6s. Let the silence carry it. (Note: the bundled SFX library has no sustained ambient/room-tone asset — if none is available, keep the cold open cleanly silent, which serves the same intent.)
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` — **starts exactly at the cut to S2 (video 0:04)** so its downbeat lands with the wordmark; volume ~0.30. (Runtime can't tween audio volume, so a true fade-out isn't possible — the bed holds low and ends with the video.)
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`, tempo ~110 BPM. **Because music now starts at video 0:04, cue track-time τ maps to video time 4.0 + τ.** Re-locked under the new pacing:
  - Wordmark (S2) = music start (τ=0) — inherently on the downbeat; no separate lock needed.
  - Score-chip payoff (S3, video ~11.1s) → nearest beat τ≈7.09 → **lock ≈ 11.09s** (readability over exact strong-cue match).
  - Outro tagline (S5, video ~21.5s) → strong cue τ≈17.47 (0.99) → **lock ≈ 21.47s**.
  - Gradebook cells (S4) snap to consecutive beats τ≈11.46/12.02/12.55/13.11 → video ≈ 15.46/16.02/16.55/17.11.
  Keep the principle: ~2 strong locks, readability wins.
- Audio-reactive treatment: subtle; let the daylight warmth and the score-chip presence breathe with RMS. No waveform/equalizer visuals.
- SFX posture: sparse, motion-matched, professional restraint. One soft pen-contact accent in the cold open, one clean confirm chime when the score chip lands, soft ticks as gradebook cells fill, one soft bell under the outro.
- Restraint rule: never more than one SFX per beat; nothing aggressive; music never above 0.35.

## Storyboard (cinematic pass)

Scene boundaries: S1 0:00–0:04 · S2 0:04–0:07 · S3 0:07–0:14 · S4 0:14–0:18 · S5 0:18–0:22.

### Scene 1 — The pain (cold open) — 4s
Wide shot, near-dark. A single desk lamp cuts a warm pool of light across a cluttered desk; a tall stack of ungraded papers takes up the left third of the frame, out of the lamp's direct reach. Nothing moves except the environment breathing — dust drifting in the lamp beam, a faint flicker — until the final beat: a hand (in shadow) enters with a red pen already uncapped and makes first contact with the top paper. The line lands as the pen is mid-stroke, not before:
**"Grading short answers ate your weekend."**
Lighting: warm, low-key, high contrast — the lamp is the only light source. Shallow depth of field.
Camera: one slow push-in, barely perceptible, wide → settling closer across the full 4s.
Audio: unscored. Room-tone/lamp-hum under the first ~3s (if available), then a single soft pen-contact SFX at ~3.6s. No music.
Transition: cut → Scene 2.

### Scene 2 — Wordmark reveal — 3s
Cut to a static, held frame — no camera movement. The lighting pivot: dark desk → clean, even daylight on warm paper. "SOL" wordmark centered with a hairline underline; copy settles below, second line in `--brand` green:
**"Build the quizzes."** / **"Let AI grade the hard ones."**
Held and confident — a film title card, not a UI transition. Resist animating the type in with flourish. Flat, even depth.
Camera: static hold.
Audio: **music starts here** (low bed, its downbeat on the cut). Optional whisper-quiet soft accent under the wordmark.
Transition: clean → Scene 3.

### Scene 3 — The grading moment (centerpiece) — 7s
Even, calm daylight — the lighting has fully shifted. The most room of any scene. Quiz card enters: a short-answer response is visible and readable, then the AI **score chip "8/10"** lands, then the **reasoning line** reveals beneath it. Caption below card: **"Short and long answers, scored — with reasoning you can review."**
Camera: slow push-in through the first ~4s, settling into a **rack focus** at the score-chip payoff — foreground desk clutter (a pen, a coffee ring) softens out of focus as the score chip and reasoning sharpen in. Shallow depth of field.
Sequential: card in → response settles → chip lands (payoff, beat-lock ≈ 11.09s) → reasoning reveals; hold full state ~1.8s.
Audio: one clean confirm chime (`interface/bong_001`) as the chip lands. // beat-locked ≈ 11.09s
Transition: clean → Scene 4.

### Scene 4 — You stay in charge — 4s
Static-but-considered frame — steady as the professor's authority. A cursor moves to the reasoning line, **"Override"** highlights, then a compact gradebook strip ticks in cell by cell:
**"You stay the grader of record. The model does the first pass."**
Camera: static (no move — precision and control).
Sequential: cursor + Override highlight, then cells fill on the beat grid (≈ 15.46 / 16.02 / 16.55 / 17.11s), hold the set after.
Audio: soft `ui/rollover` on the cursor; light `interface/drop_002` ticks as cells fill.
Transition: clean → Scene 5.

### Scene 5 — Outro — 4s
Return to a static held frame — mirrors S2's stillness, bookending the film. Even daylight. "SOL" wordmark + hairline + the punchline, verbatim:
**"Less time grading. More time teaching."**
Small muted footer: strat-ops.net/learning. Flat, even depth.
Camera: static hold.
Sequential: tagline lands on the strong cue (beat-lock ≈ 21.47s), footer settles after; hold to end.
Audio: one soft `impact/impactBell_heavy_003` under the tagline. Music holds low to the end. // beat-locked ≈ 21.47s
Transition: end.

**Music mood for this video:** polished / warm-editorial (steady, clean, low), entering only at the S2 cut.
**Audio summary:** A silent, tense cold open (room-tone + one pen-contact sound) gives way — on the cut to the wordmark — to a low warm bed that runs to the end, with a handful of restrained, motion-matched accents: the score-chip confirm on its beat, soft gradebook ticks, and one soft bell under the outro tagline.
