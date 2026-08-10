"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MARKETING_FAQS } from "@/lib/marketingFaq";

export function Faq() {
  return (
    <section
      id="faq"
      className="border-t border-rule bg-[color-mix(in_oklch,var(--surface-sunken)_78%,transparent)] dark:bg-[color-mix(in_oklch,oklch(0.11_0.006_70)_82%,transparent)]"
    >
      <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8 md:py-28">
        <div className="grid gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-4 md:sticky md:top-24 md:self-start">
            <span className="eyebrow text-ink-faint">FAQ</span>
            <h2
              className="mt-3 font-display text-ink"
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                lineHeight: 1.05,
                fontVariationSettings: '"opsz" 96, "SOFT" 30',
              }}
            >
              Straight answers
              <br />
              <em className="text-brand">before you try it.</em>
            </h2>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-ink-muted">
              The questions instructors ask first — about control, subjective
              scoring, and who stays in charge.
            </p>
          </div>

          <div className="md:col-span-8">
            <Accordion
              type="single"
              collapsible
              className="border-t border-rule"
              defaultValue="item-0"
            >
              {MARKETING_FAQS.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="border-rule"
                >
                  <AccordionTrigger className="py-5 text-left font-display text-base text-ink hover:no-underline hover:text-brand md:text-lg [&[data-state=open]]:text-brand">
                    <span
                      style={{
                        fontVariationSettings: '"opsz" 36, "SOFT" 30',
                      }}
                    >
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-base leading-relaxed text-ink-muted">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
