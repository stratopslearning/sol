# Hyperframes Composition Brief: SOL

## Objective
Create a short, polished launch-style brag video for SOL — an academic LMS whose differentiator is AI-graded subjective answers *with reviewable reasoning*, and a human who stays the grader of record.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: ~21 seconds (5 scenes: 3.5 + 3.5 + 6 + 4 + 4)

## Source Material
- Project root: `/Users/yashajaysawant/Downloads/sol-main`
- Primary files read: `README.md`, `app/page.tsx`, `components/marketing/Hero.tsx`, `components/marketing/FeatureGrid.tsx`, `components/marketing/StatsBand.tsx`, `app/globals.css`, `app/layout.tsx`
- Product name: **SOL**
- Tagline / strongest claim: "Build the quizzes. Let AI grade the hard ones."
- Key UI/visual moment to recreate: a **quiz card with a short-answer response, an AI score chip (8/10), and a reasoning line** — the grading payoff. Secondary: the Fraunces hero headline on warm paper; a compact gradebook strip.
- Copy that must appear verbatim:
  - "Grading short answers ate your weekend." (hook — paraphrase-of-pain, our line, keep as written)
  - "Build the quizzes."
  - "Let AI grade the hard ones."
  - "Short and long answers, scored — with reasoning you can review."
  - "You stay the grader of record. The model does the first pass."
  - "Less time grading. More time teaching."

## Creative Direction
- Tone preset: polished
- Creative direction: a quiet, editorial product film for professors — warm paper, red-pen relief, serif confidence.
- Interpretation: fewer scenes, longer holds, restrained motion; confidence through calm. One dry accent per beat, never busy. Wit is in the honest framing, delivered straight.
- Angle: The red pen is the enemy. SOL's pitch is relief — subjective answers scored *with visible reasoning*, and the professor still in charge. Lean on SOL's real copy and its warm-paper / deep-green / Fraunces identity, never generic edtech gloss.
- Hook: red-pen marks scratch onto paper, then "Grading short answers ate your weekend."
- Outro / punchline: "Less time grading. More time teaching." on the SOL wordmark.
- Avoid:
  - Generic SaaS language ("streamline your workflow")
  - Abstract filler visuals / particle systems / equalizer bars
  - Any redesign that isn't SOL's paper + green + Fraunces identity

## Visual Identity
- Background: `oklch(0.985 0.004 85)` warm paper (`--paper`); card surface `oklch(1 0 0)` (`--surface`)
- Text: `oklch(0.22 0.012 60)` ink (`--ink`); muted `oklch(0.45 0.01 60)` (`--ink-muted`); faint `oklch(0.65 0.008 60)`
- Accent: brand green `oklch(0.42 0.075 162)` (`--brand`); terracotta `oklch(0.62 0.135 38)` (`--accent`); red-pen `oklch(0.55 0.18 25)` (`--danger`); success green for the score `oklch(0.55 0.11 150)` (`--success`)
- Rule/hairline: `oklch(0.9 0.006 85)` (`--rule`)
- Display font: **Fraunces** (Google Fonts; use optical-size/soft feel, heavy `opsz`, tracking ~-0.035em). Body: **Instrument Sans**. Mono/numerals: **JetBrains Mono**. Load via Google Fonts `<link>` in the composition; fall back to `Georgia, serif` / `system-ui` / `ui-monospace` if offline.
- Visual references from the project: hairline rules between sections; eyebrow labels in mono uppercase; green used only as the one accent; numerals in mono `tnum`; generous whitespace on paper.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. The pain (hook) — 3.5s — red-pen marks scratch on paper → "Grading short answers ate your weekend."
2. Wordmark reveal — 3.5s — SOL wordmark + "Build the quizzes." / "Let AI grade the hard ones." (2nd line green)
3. The grading moment (centerpiece) — 6s — quiz card: short-answer response → score chip "8/10" lands → reasoning line reveals → caption "Short and long answers, scored — with reasoning you can review."
4. You stay in charge — 4s — cursor to reasoning, "Override" highlights, gradebook cells tick in → "You stay the grader of record. The model does the first pass."
5. Outro — 4s — SOL wordmark + "Less time grading. More time teaching."; music fades out.

## Audio
- Audio role: warm, restrained editorial bed + 2-3 subtle motion-matched SFX.
- Audio arc: low bed the whole ~21s; a gentle warmth lift on the score payoff; fade to near-silence across the last ~1.5s so the outro line breathes.
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` at volume ~0.30 (never above 0.35).
- Music treatment: start 0:00, hold low, fade under the final wordmark.
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (copy it in). Tempo ~110 BPM. Strong cues: 8.74, 13.11, 17.47, 22.93s. Beat grid available for gradebook cells. Lock ~2 strong cues: wordmark drop ≈ 8.74s; score-chip confirm ≈ 13.11s (both within ±0.15s). Ignore any cue that hurts readability.
- Audio-reactive treatment: subtle; use RMS/bass to let the paper background warmth and the score-chip presence breathe. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Scene 1 pen marks — soft pen/paper scratch per stroke (`keyboard/`-style is wrong here; prefer a soft `interface/drop_*` or a light `impactWood_light_*` per stroke, low volume)
  - Scene 2 wordmark — one gentle `interface/drop_001` as it settles (beat-lock ≈ 8.74s)
  - Scene 3 score chip — one clean confirm: `interface/bong_001` or `impact/impactBell_heavy_000` (beat-lock ≈ 13.11s) — the payoff
  - Scene 4 gradebook cells — soft ticks on the beat grid (~17.5–19.7s); light `ui/rollover*` on cursor
  - Scene 5 outro — one soft `impact/impactBell_heavy_003` under the wordmark (≈ 22.93s), music fading
- SFX selection guidance: sparse, motion-matched, polished. Nothing aggressive. First frame of each accent aligns to the start of the motion.
- SFX analysis guidance: read `~/.claude/skills/brag/assets/sfx/sfx-analysis.md`; prefer low high-frequency-risk files for the repeated pen strokes and gradebook ticks.
- Exact SFX choice: Hyperframes picks filenames, timestamps, density, and volume based on the implemented animation (SFX 0.55–0.75 for polished).
- Audio files: copy chosen music + cue JSON + any selected SFX into `brag-output/composition/assets/` (relative paths only — never absolute).

## Hyperframes Instructions
Use the current `hyperframes` skill and CLI workflow (`hyperframes-core` contract, `hyperframes-cli` dev loop). Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI element from SOL — the quiz card + AI score chip + reasoning is the required centerpiece.
- Keep all text readable: short labels ~0.8s settled; the hook and headline hold ~1.4–1.6s.
- Total duration 15–25s (target ~21s).
- Include the music + SFX layer (audio not disabled).
- Treat cue metadata as optional timing hints; lock only ~2 strong cues; readability wins over any beat.
- Subtle audio-reactive treatment on background warmth / score-chip presence; no visualizer graphics.
- Use local assets; relative paths from `composition/`.
- Run `hyperframes lint` and `hyperframes validate` before render; render to `brag-output/brag.mp4`.
