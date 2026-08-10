"use client";

import type { ComponentProps, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { withBasePath } from "@/lib/basePath";
import { cn } from "@/lib/utils";

interface FooterLink {
  title: string;
  href: string;
}

interface FooterSection {
  label: string;
  links: FooterLink[];
}

const footerLinks: FooterSection[] = [
  {
    label: "Platform",
    links: [
      { title: "Capabilities", href: withBasePath("/#capabilities") },
      { title: "Approach", href: withBasePath("/#approach") },
    ],
  },
  {
    label: "Guides",
    links: [
      { title: "Docs", href: withBasePath("/docs") },
      { title: "About SOL", href: withBasePath("/docs/about-sol") },
      {
        title: "Professor onboarding",
        href: withBasePath("/docs/professor-onboarding"),
      },
      {
        title: "Student getting started",
        href: withBasePath("/docs/student-getting-started"),
      },
      {
        title: "Agent Access",
        href: withBasePath("/docs/professor-agent-access"),
      },
    ],
  },
  {
    label: "Account",
    links: [
      { title: "Sign in", href: withBasePath("/login") },
      { title: "Sign up", href: withBasePath("/signup") },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative w-full overflow-hidden border-t border-rule bg-paper"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(35%_128px_at_50%_0%,color-mix(in_oklch,var(--brand)_18%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/40 blur-[2px]"
      />

      <div className="relative mx-auto max-w-[1200px] px-4 py-14 md:px-8 md:py-16 lg:py-20">
        <div className="grid w-full gap-10 xl:grid-cols-3 xl:gap-12">
          <AnimatedContainer className="space-y-4 xl:col-span-1">
            <a
              href={withBasePath("/")}
              className="inline-flex items-baseline gap-1 text-ink"
            >
              <span
                className="font-display text-2xl tracking-tight"
                style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
              >
                SOL
              </span>
            </a>
            <p className="max-w-[44ch] text-sm leading-relaxed text-ink-muted">
              A coursework platform for faculty and students — quizzes,
              feedback, and discussion in one place, with clarity on both
              sides of the desk.
            </p>
            <p className="pt-2 text-sm text-ink-faint md:pt-4">
              © {year} SOL Learning. All rights reserved.
            </p>
          </AnimatedContainer>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10 xl:col-span-2 xl:mt-0">
            {footerLinks.map((section, index) => (
              <AnimatedContainer
                key={section.label}
                delay={0.1 + index * 0.1}
              >
                <div>
                  <h3 className="eyebrow">{section.label}</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
                    {section.links.map((link) => (
                      <li key={link.title}>
                        <a
                          href={link.href}
                          className="inline-flex items-center transition-colors duration-300 hover:text-ink"
                        >
                          {link.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>

        <AnimatedContainer delay={0.35} className="mt-14">
          <div className="hairline mb-6" />
          <div className="flex justify-end text-xs text-ink-faint">
            <span className="font-mono tnum">v3 · {year} edition</span>
          </div>
        </AnimatedContainer>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>["className"];
  children: ReactNode;
};

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
