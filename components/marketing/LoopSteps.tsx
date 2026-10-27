"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { withBasePath } from "@/lib/basePath";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  {
    n: "01",
    title: "Materials become a course draft",
    body: "Upload a syllabus or notes. SOL drafts lessons, practice, and quizzes. You edit in chat and approve before anyone sees it.",
    checks: ["Lessons and practice from your files", "You publish, SOL does not"],
    painting: withBasePath("/marketing/loop-materials-draft.jpg"),
    alt: "Oil painting of a syllabus and notes becoming a bound course binder on a sunlit desk",
  },
  {
    n: "02",
    title: "A tutor that only knows your course",
    body: "Learners get help grounded in your materials, not the open web.",
    checks: ["Course-scoped answers", "No generic chatbot drift"],
    painting: withBasePath("/marketing/loop-course-tutor.jpg"),
    alt: "Oil painting of two open course notebooks under a lamp, laptop set aside in shadow",
  },
  {
    n: "03",
    title: "Assessments that reward understanding",
    body: "Randomized variants, follow-ups about a student’s own answer, and discussions that are hard to game.",
    checks: ["Follow-ups on their own work", "Discussions you can audit"],
    painting: withBasePath("/marketing/loop-assessments.jpg"),
    alt: "Oil painting of exam booklets and a fountain pen on a wooden desk under warm lamp light",
  },
  {
    n: "04",
    title: "Grades you can audit, gaps you can reteach",
    body: "Rubric matches from the model, scores from code, manual review when unsure, and concept-level insight.",
    checks: ["Criterion-level transparency", "Weak questions surface early"],
    painting: withBasePath("/marketing/loop-grades-gaps.jpg"),
    alt: "Oil painting of a rubric ledger and marked papers with a concept sketch under a reading lamp",
  },
] as const;

export function LoopSteps() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const rootRef = useRef<HTMLElement>(null);
  const paintingRef = useRef<HTMLDivElement>(null);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-step-item]");
        if (!items.length) return;
        gsap.from(items, {
          autoAlpha: 0,
          x: -14,
          duration: 0.55,
          stagger: 0.07,
          ease: "power3.out",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 75%",
            toggleActions: "play none none none",
          },
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      bodyRefs.current.forEach((el, index) => {
        if (!el) return;
        const open = index === active;
        gsap.killTweensOf(el);

        if (reduce) {
          gsap.set(el, {
            height: open ? "auto" : 0,
            autoAlpha: open ? 1 : 0,
          });
          return;
        }

        if (open) {
          gsap.set(el, { height: "auto" });
          const h = el.offsetHeight;
          gsap.fromTo(
            el,
            { height: 0, autoAlpha: 0 },
            {
              height: h,
              autoAlpha: 1,
              duration: 0.4,
              ease: "power3.out",
              onComplete: () => gsap.set(el, { height: "auto" }),
            },
          );
          const checks = el.querySelectorAll("[data-step-check]");
          if (checks.length) {
            gsap.from(checks, {
              autoAlpha: 0,
              x: -6,
              stagger: 0.05,
              duration: 0.35,
              delay: 0.08,
              ease: "power2.out",
            });
          }
        } else {
          gsap.to(el, {
            height: 0,
            autoAlpha: 0,
            duration: 0.28,
            ease: "power2.inOut",
          });
        }
      });
    },
    { scope: rootRef, dependencies: [active], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      const panel = paintingRef.current;
      if (!panel) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(panel, { clearProps: "transform,opacity,visibility" });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          panel,
          { autoAlpha: 0, scale: 1.03, y: 8 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.5,
            ease: "power3.out",
          },
        );
      });
      return () => mm.revert();
    },
    { scope: paintingRef, dependencies: [active], revertOnUpdate: true },
  );

  return (
    <section
      ref={rootRef}
      id="product"
      className="relative overflow-hidden border-t border-rule/60"
    >
      <div className="page-rail relative z-10 px-4 py-20 md:px-8 md:py-28">
        <ScrollReveal>
          <div className="mx-auto max-w-[40rem] text-center">
            <p className="eyebrow text-ink-faint">How it works</p>
            <h2
              className="mt-4 font-display text-ink text-balance"
              style={{
                fontSize: "clamp(1.9rem, 1.6vw + 1.3rem, 3rem)",
                lineHeight: 1.12,
              }}
            >
              From your materials,{" "}
              <em className="mkt-italic text-ink-muted">a course you can stand behind</em>
            </h2>
            <p className="mx-auto mt-4 max-w-[42ch] text-base leading-relaxed text-ink-muted">
              Upload once. Get a draft course, a course-only tutor, and
              assessments you can trust. Students see nothing until you say so.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          <ScrollReveal className="lg:col-span-5">
            <ol className="flex flex-col gap-2">
              {STEPS.map((item, index) => {
                const open = index === active;
                return (
                  <li key={item.n} data-step-item>
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      className={cn(
                        "w-full rounded-[1.15rem] border px-4 py-4 text-left transition-colors",
                        open
                          ? "border-rule bg-surface shadow-paper"
                          : "border-transparent hover:bg-surface/70",
                      )}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-[0.7rem] tracking-[0.14em] text-ink-faint">
                          {item.n}
                        </span>
                        <span
                          className={cn(
                            "font-display text-ink",
                            open
                              ? "text-[1.2rem]"
                              : "text-[1.05rem] text-ink-muted",
                          )}
                        >
                          {item.title}
                        </span>
                      </div>
                      <div
                        ref={(el) => {
                          bodyRefs.current[index] = el;
                        }}
                        className="overflow-hidden"
                        style={{
                          height: index === 0 ? "auto" : 0,
                          opacity: index === 0 ? 1 : 0,
                        }}
                        aria-hidden={!open}
                      >
                        <div className="mt-3 pl-9">
                          <p className="text-sm leading-relaxed text-ink-muted">
                            {item.body}
                          </p>
                          <ul className="mt-3 space-y-1.5">
                            {item.checks.map((check) => (
                              <li
                                key={check}
                                data-step-check
                                className="flex items-start gap-2 text-sm text-ink"
                              >
                                <span
                                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                                  aria-hidden
                                />
                                {check}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </ScrollReveal>

          <ScrollReveal className="lg:col-span-7" delay={0.08}>
            <div className="relative overflow-hidden rounded-[1.5rem] bg-surface-sunken shadow-paper">
              <div className="relative h-[min(34rem,72vw)] w-full">
                <div ref={paintingRef} className="absolute inset-0">
                  <Image
                    key={step.n}
                    src={step.painting}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-cover"
                    priority={active === 0}
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
