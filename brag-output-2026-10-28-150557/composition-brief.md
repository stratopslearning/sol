# Hyperframes Composition Brief: SOL

## Objective
A 24s square launch film for SOL for LinkedIn, in SOL's oil-painting retro identity.

## Output
- Composition directory: `brag-output-2026-10-28-150557/composition/`
- Rendered video: `brag-output-2026-10-28-150557/brag.mp4`
- Format: square, 1080x1080
- Duration: 24.0s

## Source Material
- Project root: `/Users/yashajaysawant/Projects/sol-main`
- Primary files read: `app/globals.css`, `content/brand/design.md`, `content/brand/IDENTITY.md`, `components/marketing/{Hero,LoopSteps,HumanSafety,Footer}.tsx`, `lib/seo.ts`
- Product name: SOL
- Tagline: "The operating system for teaching." Brand phrase: "Teaching, in a better light."
- Key visuals: the marketing oil paintings in `public/marketing/`, SOL mark `public/brand/sol-mark.svg`
- Copy that must appear verbatim:
  - "Sol means sun." / "A sun doesn't do the work for you." / "It lets you see." (IDENTITY.md origin line, split)
  - "The operating system for teaching."
  - "Materials become a course draft" / "A tutor that only knows your course" / "Assessments that reward understanding"
  - "7 of 10" / "You covered 3 of the 4 rubric points." (IDENTITY.md grade microcopy)
  - "SOL drafts. You decide what ships and what scores."
  - "Teaching, in a better light."

## Creative Direction
- Tone preset: polished; direction: vintage art catalog / museum walk at sunrise.
- Lighting arc night → morning → full sun. One slow camera move per scene.
- Global retro texture: film grain, warm vignette, a persistent cream mat border around the frame.
- Avoid: fake UI over paintings, purple/neon, hype words, em dashes on screen, ALL CAPS except the wordmark.

## Visual Identity
- Paper `#f4f1e8`, surface `#fbfaf6`, ink `#1c1b17`, muted `#5c5a52`, olive `#4a5240`, leaf `#6d7f5c`, terracotta `#c47a3a`, rule `#ddd6c6`/`#c9c0ad`, on-dark `#f7f4ec`
- Display: Instrument Serif 400 (+ italic); body: Geist

## Storyboard
See `brag-plan.md`. Summary: 1 Lamplight 3.6s · 2 Sunrise 3.4s · 3 Plates 8.2s · 4 Grade explained 5.2s · 5 Better light 3.6s.

## Audio
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`, 0.3, fade in 0-1.5s, fade out 22.8-24s.
- Cues: `assets/music/cues/...music-cues.json`. Locks 4.91 / 17.47 / 22.93; plate grid 7.09 / 9.83 / 12.55.
- Audio-reactive: subtle RMS on light glow layers (`audio-data.js`, extracted with hyperframes-creative `extract-audio-data.py`).
- SFX: warm wood knocks per plate, soft drops on rubric marks, soft impact on wordmark, bell on final mark. 0.5-0.7 volume.
