# Accessibility Conformance Report (self-assessed ACR)

**Product:** SOL  
**Version / date:** 2026-08-12  
**Standard:** WCAG 2.1 Level AA (target)  
**Report type:** Internal self-assessment — **not** a third-party VPAT/ACR  
**Evaluation methods:** Code review of critical flows + known component library patterns (`radix-ui`, semantic HTML). Full assistive-technology lab testing not yet completed.

Commission a formal VPAT from an accessibility vendor before claiming Section 508 / full WCAG AA conformance to FGCU.

---

## Product description

SOL is a web coursework platform (Next.js) for higher-ed faculty and students: authentication, section enrollment, quizzes, gradebook, discussions, and admin tools.

---

## Critical flows in scope

1. Sign in / sign up (Clerk-hosted components)
2. Student section enrollment
3. Take / submit a quiz
4. Faculty gradebook and results export
5. Public docs / privacy / terms

---

## Conformance summary (self-assessed)

| WCAG 2.1 principle | Level A | Level AA | Notes |
| --- | --- | --- | --- |
| Perceivable | Partial | Partial | Text contrast generally follows design tokens; some marketing motion needs reduced-motion (present in places). Charts/complex visuals not fully audited. |
| Operable | Partial | Partial | Interactive controls largely keyboard-reachable via Radix primitives; custom marketing animations and some dense admin tables need deeper keyboard/AT testing. |
| Understandable | Partial | Partial | Labels present on primary forms; Clerk UI inherits Clerk a11y. Error messaging consistency varies by surface. |
| Robust | Partial | Partial | Semantic landmarks (`main`, nav) on marketing/docs; dashboard chrome uses shared shell. |

**Overall:** Partially supports WCAG 2.1 AA for critical academic flows. **Does not claim full conformance.**

---

## Supports (examples)

- Skip-capable `main` landmark on docs/legal/marketing shells
- `aria-*` / `sr-only` patterns on several UI primitives
- Focus rings on many interactive controls (`focus-visible` styles)
- `prefers-reduced-motion` respected in parts of marketing motion
- Form labels on primary export / enrollment controls

---

## Known gaps / does not support yet

- No third-party VPAT
- Full keyboard-only pass of every admin and professor table not completed
- Clerk-hosted widgets: accessibility depends on Clerk’s components; we inherit their constraints
- Complex gradebook / results grids may lack complete screen-reader table semantics
- PDF/CSV exports are not accessible documents (CSV is data; consuming tools vary)
- Live region announcements for async grading status may be incomplete

---

## Remediation plan

1. Keyboard + VoiceOver/NVDA pass on the five critical flows; file issues.
2. Fix high-severity findings before FGCU broad rollout.
3. Commission formal VPAT/ACR from an accessibility consultant.
4. Re-test after Clerk Enterprise SSO UI changes.

---

## HECVAT IT Accessibility answers

| Question | Answer |
| --- | --- |
| Do you have a VPAT/ACR? | Self-assessed ACR yes ([this file](./VPAT.md)); third-party VPAT **not yet**. |
| WCAG conformance | Targeting 2.1 AA; partially supports; gaps listed above. |
| Keyboard-only operable? | Primary flows intended to be; full coverage pending audit. |

**Author:** Founder / engineering lead  
**Sign-off:** 2026-08-12 (self-assessment)
