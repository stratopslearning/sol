"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { withBasePath } from "@/lib/basePath";

const STAMP = withBasePath("/marketing/stamp-hands.jpg");

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HumanSafety() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cols = rootRef.current?.querySelectorAll("[data-trust-col]");
        if (!cols?.length) return;
        gsap.from(cols, {
          autoAlpha: 0,
          y: 28,
          duration: 0.75,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: rootRef.current?.querySelector("[data-trust-grid]"),
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} id="trust" className="border-t border-rule/60">
      <div className="page-rail px-4 py-20 md:px-8 md:py-28">
        <ScrollReveal>
          <div className="mx-auto max-w-[40rem] text-center">
            <p className="text-3xl" aria-hidden>
              ✦
            </p>
            <h2
              className="mt-4 font-display text-ink text-balance"
              style={{
                fontSize: "clamp(1.9rem, 1.5vw + 1.3rem, 2.85rem)",
                lineHeight: 1.15,
              }}
            >
              Automated work,{" "}
              <em className="mkt-italic text-ink-muted">human judgment</em>
            </h2>
            <p className="mx-auto mt-4 max-w-[42ch] text-base leading-relaxed text-ink-muted">
              SOL does the draft work. You keep the final say: on what ships, and
              on every grade that is not clear-cut.
            </p>
          </div>
        </ScrollReveal>

        <div
          data-trust-grid
          className="mt-14 grid items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-8"
        >
          <div data-trust-col className="md:text-right">
            <h3
              className="font-display text-ink"
              style={{ fontSize: "1.35rem", lineHeight: 1.3 }}
            >
              Nothing is final without you
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted md:ml-auto md:max-w-[32ch]">
              Drafts stay hidden until you release them. Unsure answers wait in
              Attention. You remain the grader of record.
            </p>
          </div>

          <div
            data-trust-col
            className="mx-auto w-[min(100%,16rem)] rotate-[-2deg] rounded-[0.6rem] border-[10px] border-rule-strong bg-surface p-2 shadow-paper-lg"
          >
            <div className="overflow-hidden rounded-[0.25rem] border border-rule">
              <Image
                src={STAMP}
                alt="Painting of hands exchanging course materials"
                width={640}
                height={640}
                className="aspect-square w-full object-cover"
              />
            </div>
          </div>

          <div data-trust-col>
            <h3
              className="font-display text-ink"
              style={{ fontSize: "1.35rem", lineHeight: 1.3 }}
            >
              Fits the LMS you already run
            </h3>
            <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-ink-muted">
              Built for Canvas first: teaching work in SOL, grades designed to
              pass back. FERPA-minded by default. We do not train on your
              students’ work.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
