const ROWS = [
  {
    aspect: "Turnaround",
    human: "Hours to days while a stack waits in a queue — feedback arrives after the class has moved on.",
    sol: "First-pass scores return while the material is still warm. You spend time where judgment matters.",
  },
  {
    aspect: "Consistency",
    human: "Standards drift across a long night, a second cup of coffee, or between graders on the same rubric.",
    sol: "Every response is read against the same rubric language. Outliers surface for your review — not silent variance.",
  },
  {
    aspect: "Reasoning",
    human: "The score is often the only artifact. Why a point was lost lives in memory or a thin margin note.",
    sol: "Each subjective score includes model reasoning you can inspect, adjust, or explain to a learner.",
  },
  {
    aspect: "Scale",
    human: "Open-ended work doesn’t scale with enrollment. Something gives: depth, sleep, or turnaround.",
    sol: "Short and long answers get a careful first pass at section scale — without abandoning the written response.",
  },
  {
    aspect: "Control",
    human: "Full control — and the full cost of exercising it on every line.",
    sol: "Full control retained. Override any score. Attention queues pull you to what still needs a human eye.",
  },
  {
    aspect: "Record",
    human: "Spreadsheets, inbox threads, and incomplete trails when a grade is questioned later.",
    sol: "Attempts, rationale, and adjustments stay together — exportable when records or appeals need them.",
  },
] as const;

export function Comparison() {
  return (
    <section
      id="compare"
      className="border-t border-rule bg-[color-mix(in_oklch,var(--paper)_72%,transparent)] dark:bg-[color-mix(in_oklch,var(--surface-sunken)_78%,transparent)]"
    >
      <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[52rem] text-center">
          <span className="eyebrow text-ink-faint">Compare</span>
          <h2
            className="mt-3 font-display text-ink"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              lineHeight: 1.05,
              fontVariationSettings: '"opsz" 96, "SOFT" 30',
            }}
          >
            Human judgment,{" "}
            <em
              className="text-brand"
              style={{ fontVariationSettings: '"opsz" 96, "WONK" 1' }}
            >
              without the all-nighter.
            </em>
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-base leading-relaxed text-ink-muted md:text-lg">
            SOL doesn’t replace the grader. It takes the first pass on
            subjective answers so your attention goes to the work that still
            needs a person.
          </p>
        </div>

        {/* Desktop comparison table */}
        <div className="mt-14 hidden overflow-hidden rounded-lg border border-rule md:block">
          <div className="grid grid-cols-[minmax(7rem,0.7fr)_1.15fr_1.35fr] border-b border-rule bg-[color-mix(in_oklch,var(--surface-sunken)_88%,transparent)] dark:bg-black/45">
            <div className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Dimension
            </div>
            <div className="border-l border-rule px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Grading alone
            </div>
            <div className="border-l border-rule bg-brand-soft/50 dark:bg-brand/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
              With SOL
            </div>
          </div>

          {ROWS.map((row) => (
            <div
              key={row.aspect}
              className="grid grid-cols-[minmax(7rem,0.7fr)_1.15fr_1.35fr] border-b border-rule bg-[color-mix(in_oklch,var(--surface)_90%,transparent)] last:border-b-0 dark:bg-[color-mix(in_oklch,var(--paper)_88%,transparent)]"
            >
              <div className="flex items-start px-5 py-6">
                <span
                  className="font-display text-ink"
                  style={{
                    fontSize: "1.125rem",
                    lineHeight: 1.3,
                    fontVariationSettings: '"opsz" 36',
                  }}
                >
                  {row.aspect}
                </span>
              </div>
              <div className="border-l border-rule px-5 py-6 text-sm leading-relaxed text-ink-muted">
                {row.human}
              </div>
              <div className="border-l border-rule bg-brand-soft/25 dark:bg-brand/10 px-5 py-6 text-sm leading-relaxed text-ink">
                {row.sol}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile stacked comparison */}
        <div className="mt-10 flex flex-col gap-4 md:hidden">
          {ROWS.map((row) => (
            <article
              key={row.aspect}
              className="overflow-hidden rounded-lg border border-rule bg-[color-mix(in_oklch,var(--surface)_90%,transparent)] dark:bg-[color-mix(in_oklch,var(--paper)_88%,transparent)]"
            >
              <header className="border-b border-rule bg-[color-mix(in_oklch,var(--surface-sunken)_88%,transparent)] px-4 py-3 dark:bg-black/45">
                <h3
                  className="font-display text-ink"
                  style={{
                    fontSize: "1.125rem",
                    fontVariationSettings: '"opsz" 36',
                  }}
                >
                  {row.aspect}
                </h3>
              </header>
              <div className="grid gap-0">
                <div className="border-b border-rule px-4 py-4">
                  <p className="eyebrow text-ink-faint">Grading alone</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {row.human}
                  </p>
                </div>
                <div className="bg-brand-soft/30 dark:bg-brand/10 px-4 py-4">
                  <p className="eyebrow text-brand">With SOL</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink">
                    {row.sol}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-[52ch] text-center text-sm leading-relaxed text-ink-faint">
          You remain the grader of record. SOL accelerates the first reading —
          it does not hide how a score was reached.
        </p>
      </div>
    </section>
  );
}
