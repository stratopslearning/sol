import { withBasePath } from "@/lib/basePath";

import { TwinklePixels } from "./TwinklePixels";

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
      { title: "Product", href: withBasePath("/#product") },
      { title: "Compare", href: withBasePath("/#compare") },
      { title: "Approach", href: withBasePath("/#approach") },
      { title: "FAQ", href: withBasePath("/#faq") },
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
  {
    label: "Legal",
    links: [
      { title: "Privacy", href: withBasePath("/privacy") },
      { title: "Terms", href: withBasePath("/terms") },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative w-full overflow-hidden border-t border-rule bg-[color-mix(in_oklch,var(--surface-sunken)_78%,transparent)]">
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 pt-16 pb-28 md:px-8 md:pt-20 md:pb-32">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="max-w-[22rem] shrink-0 space-y-4">
            <a
              href={withBasePath("/")}
              className="inline-flex items-baseline text-ink"
            >
              <span
                className="font-display text-2xl tracking-tight"
                style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
              >
                SOL
              </span>
            </a>
            <p className="text-sm leading-relaxed text-ink-muted">
              A coursework platform for faculty and students — quizzes,
              feedback, and discussion in one place.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 sm:gap-x-10 lg:gap-x-14"
          >
            {footerLinks.map((section) => (
              <div key={section.label}>
                <h3 className="eyebrow text-ink-faint">{section.label}</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <a
                        href={link.href}
                        className="text-ink/85 transition-colors duration-200 hover:text-brand"
                      >
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-wrap items-end justify-between gap-4 md:mt-20">
          <p className="text-sm text-ink-faint">
            © {year} SOL Learning. All rights reserved.
          </p>
        </div>
      </div>

      <TwinklePixels className="absolute inset-x-0 bottom-0 h-44 md:h-56" />
    </footer>
  );
}
