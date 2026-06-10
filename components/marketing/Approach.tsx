import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/basePath";

const TENETS = [
  {
    n: "I",
    title: "Subjective questions matter.",
    body:
      "Short and long answers are where students actually show what they know. SOL does not punt on them. We built the product around grading the responses professors care about most.",
  },
  {
    n: "II",
    title: "AI assists. You decide.",
    body:
      "The model proposes a score and shows its work. You review, adjust, and own the final grade. Speed without handing over your judgment.",
  },
  {
    n: "III",
    title: "Your quiz, your rules.",
    body:
      "No template soup. You write the questions, set the rubric, and run the quiz your way. SOL speeds up grading. It does not rewrite your course.",
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
              Three beliefs,
              <br />
              <em className="text-brand">held stubbornly.</em>
            </h2>
            <p className="text-sm text-ink-muted max-w-[40ch] leading-relaxed">
              Why we built a quiz platform instead of another LMS. Three
              ideas we will not compromise on.
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
                          Try it yourself
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
