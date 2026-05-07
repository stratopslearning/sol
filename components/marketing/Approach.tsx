import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/basePath";

const TENETS = [
  {
    n: "I",
    title: "Reading is the work.",
    body:
      "Most LMSs make reading feel incidental — buried under modules, points, and progress bars. SOL treats long-form text as the centre of learning, not the leftover.",
  },
  {
    n: "II",
    title: "Grading is a stance.",
    body:
      "Auto-graded MCQs are easy. We took the harder problem: graded free response with auditable reasoning, so faculty can verify what a model actually concluded.",
  },
  {
    n: "III",
    title: "Quiet beats clever.",
    body:
      "We refuse confetti, streaks, and gamified nudges. Learners deserve a calm room. Faculty deserve interfaces they don't have to apologise for.",
  },
] as const;

export function Approach() {
  return (
    <section id="approach" className="bg-surface-sunken border-t border-rule">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4 md:sticky md:top-24 self-start flex flex-col gap-4">
            <span className="eyebrow">Approach</span>
            <h2
              className="font-display text-ink"
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                lineHeight: 1.05,
                fontVariationSettings: '"opsz" 96, "SOFT" 30',
              }}
            >
              Three tenets,
              <br />
              <em className="text-brand">held seriously.</em>
            </h2>
            <p className="text-sm text-ink-muted max-w-[40ch] leading-relaxed">
              The shortest version of why SOL looks and behaves the way it
              does. We chose every constraint on purpose.
            </p>
          </div>

          <ol className="md:col-span-8 flex flex-col">
            {TENETS.map((t, idx) => (
              <li
                key={t.n}
                className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 py-8 border-b border-rule last:border-b-0 first:pt-0"
              >
                <span
                  className="font-display text-brand text-3xl md:text-4xl tnum"
                  style={{ fontVariationSettings: '"opsz" 60, "SOFT" 20' }}
                  aria-hidden
                >
                  {t.n}
                </span>
                <div className="flex flex-col gap-2 max-w-[58ch]">
                  <h3
                    className="font-display text-ink"
                    style={{
                      fontSize: "1.625rem",
                      lineHeight: 1.2,
                      fontVariationSettings: '"opsz" 60, "SOFT" 30',
                    }}
                  >
                    {t.title}
                  </h3>
                  <p className="text-base text-ink-muted leading-relaxed">
                    {t.body}
                  </p>
                  {idx === TENETS.length - 1 ? (
                    <div className="pt-3">
                      <Button asChild size="default" variant="outline">
                        <a href={withBasePath("/signup")}>
                          See it for yourself
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
