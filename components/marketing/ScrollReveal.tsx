"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger child elements matching this selector */
  stagger?: string;
  y?: number;
  delay?: number;
};

/** Fade/rise on scroll via ScrollTrigger. Respects prefers-reduced-motion. */
export function ScrollReveal({
  children,
  className,
  stagger,
  y = 36,
  delay = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(root, { clearProps: "all" });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = stagger ? root.querySelectorAll(stagger) : [root];
        gsap.from(targets, {
          autoAlpha: 0,
          y,
          duration: 0.9,
          delay,
          stagger: stagger ? 0.12 : 0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: root,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [stagger, y, delay] },
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
