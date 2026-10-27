# SOL Design

Visual system for marketing, auth, and any surface that should feel like the public brand. Product identity and voice live in [`IDENTITY.md`](./IDENTITY.md). Prefer CSS tokens in `app/globals.css` (scoped under `.mkt` for marketing) over hard-coded colors.

**North star:** Academic retro / pastel vintage SaaS. Warm paper, Instrument Serif display, olive CTAs, impressionist oil paintings as the main visual idea. Calm, not cartoon; editorial, not enterprise gray.

---

## 1. Surfaces

| Surface | Wrapper | Theme |
| --- | --- | --- |
| App-wide (`:root`) | Global CSS tokens | Academic cream / olive / Instrument Serif + Geist |
| Landing | `.mkt` on the page root | Academic palette; **theme toggle** in nav (warm dark) |
| Auth (login / signup / payment) | `.auth-page.mkt` | Follows theme; painting overlays use tokens |
| Docs / legal / security | `.mkt` + solid glass nav | Follows theme |
| 404 | `.mkt` + grove wash | Follows theme |
| Dashboard / quizzes / product chrome | `AppChrome` on global tokens | Same academic theme; **theme toggle** supported (warm dark) |

Marketing and product share the warm academic light/dark tokens. Painting sections overlay with `var(--paper)` / `var(--ink)` so type stays readable in both modes.

---

## 2. Color (`.mkt`)

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` | `#f4f1e8` | Page ground |
| `--surface` | `#fbfaf6` | Cards, elevated panels |
| `--surface-sunken` | `#ebe6da` | Recessed wells |
| `--surface-elevated` | `#fffcf6` | Hover / lifted |
| `--ink` | `#1c1b17` | Primary text |
| `--ink-muted` | `#5c5a52` | Supporting copy |
| `--ink-faint` | `#8a877c` | Eyebrows, captions |
| `--rule` | `#ddd6c6` | Hairlines, borders |
| `--rule-strong` | `#c9c0ad` | Stronger borders |
| `--brand` | `#4a5240` | Olive primary / CTAs |
| `--brand-hover` | `#3b4234` | CTA hover |
| `--brand-soft` | `#e4e7dc` | Soft brand wash |
| `--brand-fg` | `#f7f4ec` | Text on brand |
| `--accent` | `#c47a3a` | Terracotta, sparingly |
| `--accent-soft` | `#f3e6d6` | Soft accent wash |
| `--mkt-leaf` | `#6d7f5c` | Atmosphere / haze |
| `--mkt-sky` | `#c5d5e0` | Atmosphere / haze |

Shadows: `--shadow-paper`, `--shadow-paper-lg` (soft, warm, low contrast).

Avoid purple gradients, neon glow, pure black/white, and default “AI purple” themes.

---

## 3. Typography

| Role | Font | Notes |
| --- | --- | --- |
| Display / headlines | Instrument Serif (`--font-serif-mkt`) | Weight 400; italic via `.mkt-italic` for emphasis half-lines |
| Body / UI | Geist Sans (`--font-sans-mkt`), Inter / Manrope fallbacks | 400–600 |
| Wordmark | Instrument Serif | `SOL` + `SolMark` |

Patterns:

- Sentence case for headings, buttons, nav.
- Headlines: `text-wrap: balance`, letter-spacing about `-0.02em`.
- Pair a plain display line with an italic muted half: `Hours of prep, *done in a clearer pass*`.
- Eyebrows: small, tracked, `text-ink-faint` (mono or uppercase tracking is fine for section labels).
- Reading measure: ~40–68ch for body; hero subcopy shorter (~36ch).

Clamp examples already in use:

- Hero H1: `clamp(2.6rem, 7vw, 4.75rem)`
- Section H2: `clamp(1.9rem, 1.5vw + 1.3rem, 2.85rem)`

---

## 4. Shape and chrome

- Radius: generous. Cards ~`1.15rem`–`1.5rem` (`.mkt-card`). Pills `999px` (`.mkt-pill`) for CTAs, nav shell when solid, auth inputs.
- Cards: only when they hold interaction (FAQ accordion, step list). Prefer open layout + painting over card grids of product chrome.
- Borders: hairline `--rule`, never heavy frames.
- Buttons: olive filled primary; ghost / frosted outline secondary. Pill shape on marketing and auth.
- Scrollbar: thin floating pill thumb, invisible track (global).

---

## 5. Imagery (oil paintings)

Paintings are the product shot. Do not overlay fake product UI demos on marketing art.

| Asset | Use |
| --- | --- |
| `classroom-morning.jpg` | Landing hero (full-bleed) |
| `loop-materials-draft.jpg` | Loop step 01: materials → draft |
| `loop-course-tutor.jpg` | Loop step 02: course tutor |
| `loop-assessments.jpg` | Loop step 03: assessments |
| `loop-grades-gaps.jpg` | Loop step 04: grades / gaps |
| `stamp-hands.jpg` | HumanSafety stamp |
| `path-light.jpg` | Closing CTA + footer band |
| `hero-grove.jpg` | FAQ section wash |
| `study-desk.jpg` | Archive / unused on landing loop |
| `auth-inkpot.jpg` | Sign up left column (auth-only) |
| `auth-sealed-journal.jpg` | Sign in left column (auth-only) |
| `foliage-*.jpg` | Optional botanical accents |

Rules:

- Impressionist / impasto, warm ochre–olive–cream. No stock photography.
- Loop step paintings are exclusive to `#product`; do not reuse hero, FAQ, trust, footer, or auth art.
- Auth paintings must not reuse landing assets.
- Soft paper scrims over art so dark ink stays readable; let the painting breathe below the fold of type.
- Closing band: painting full-bleed → olive fade into footer links (white type on deep green).

---

## 6. Layout patterns

### Landing (`app/page.tsx`)

1. **Hero**: Full-bleed classroom painting. Brand-level tagline in parentheses composition. One eyebrow, one H1, one short line, one CTA. No stats, trust strips, or floating badges on the art.
2. **How it works** (`#product`). Numbered expandable steps left; oil painting crossfade right (metaphor per step, quiet caption on the art).
3. **FAQ** (`#faq`). Grove wash + single centered accordion card.
4. **Trust** (`#trust`). Human judgment copy + stamp painting.
5. **Closing + footer**: One painting band: CTA copy, then Product / Company links and legal on the dark olive foot.

Nav: transparent over hero → morphs into frosted glass pill on scroll. Logo, Product, FAQ, Vision, Sign in, Book a demo (Cal.com).

### Auth

- 50/50 split desktop: painting | cream form column (centered).
- No marketing navbar. Small `SOL` mark above the card only.
- Clerk: pill inputs and buttons, olive primary, paper / rule borders; flush inside `.auth-card`. Hide Clerk chrome (dev badge, footer pages).

### Docs / legal

- Solid frosted pill nav (`Navbar variant="solid"`).
- Instrument Serif titles, Geist body, cream paper, hairline rules.
- Same closing painting footer as landing.
- Docs cards and quickstart use `.mkt-card`; no neon brand glow behind chrome.

### 404

- Full-bleed grove painting with paper wash; centered brand, display line, two pill CTAs. No mesh shaders.

---

## 7. Motion

- Prefer GSAP (`SplitText`, `ScrollTrigger`) and Framer Motion springs already used on landing.
- Hero: word rise on headline; soft fade for supporting lines.
- Loop paintings: crossfade on step change (~0.45s ease).
- Scroll reveal: short rise/fade; respect `prefers-reduced-motion`.
- Nav morph: ~120px scroll range, spring stiffness ~160.

Motion creates hierarchy and presence, not noise. Two or three intentional motions per page is enough.

---

## 8. Do / don’t

**Do**

- One composition per first viewport (brand + one line + one CTA + painting).
- Let paintings enact the work; keep product honesty (“Built for Canvas”, instructors approve).
- Center aligned section intros; restrained page rail.

**Don’t**

- Product demo cards over paintings on marketing.
- Purple / glow / multi-layer shadow kits.
- Dark-mode light ink on landing art.
- Em dashes, hype words, ALL CAPS (except wordmark).
- Claim unshipped Canvas sync as live.

---

## 9. Implementation map

| Concern | Where |
| --- | --- |
| Global + `.mkt` tokens | `app/globals.css` (`:root`, `.dark`, `.mkt`) |
| Product chrome | `components/layout/AppChrome.tsx`, `AppSidebar`, `AppTopBar` |
| Auth card + Clerk flush | `app/globals.css` (`.auth-*`), `components/auth/clerk-appearance.ts` |
| Brand mark | `components/brand/SolMark.tsx` |
| Landing sections | `components/marketing/*` |
| Auth shell | `components/auth/AuthShell.tsx` |
| Docs / legal shells | `components/docs/DocsShell.tsx`, `components/legal/LegalShell.tsx` |
| FAQ copy | `lib/marketingFaq.ts` |
| Voice / positioning | `content/brand/IDENTITY.md` |
