import type { ReactNode } from "react";

import { Navbar } from "@/components/frontend/Navbar";
import { Footer } from "@/components/marketing/Footer";

export function LegalShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mkt flex min-h-screen flex-col bg-paper text-ink">
      <Navbar variant="solid" />
      <main id="main" className="flex-1 pt-20 md:pt-24">
        <article className="page-rail mx-auto max-w-[42rem] px-4 py-12 md:px-8 md:py-16">
          <header className="mb-10 border-b border-rule/70 pb-8 text-center md:text-left">
            <p className="eyebrow text-ink-faint">Legal</p>
            <h1
              className="mt-3 font-display text-ink text-balance"
              style={{
                fontSize: "clamp(1.9rem, 2vw + 1.2rem, 2.75rem)",
                lineHeight: 1.12,
              }}
            >
              {title}
            </h1>
            {description ? (
              <p className="mx-auto mt-4 max-w-[52ch] text-base leading-relaxed text-ink-muted md:mx-0">
                {description}
              </p>
            ) : null}
          </header>
          <div className="docs-prose">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
