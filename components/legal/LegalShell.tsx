import type { ReactNode } from 'react';

import { Footer } from '@/components/marketing/Footer';
import { Navbar } from '@/components/frontend/Navbar';

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
    <>
      <Navbar />
      <main id="main" className="min-h-[70vh] pt-16">
        <article className="mx-auto max-w-[720px] px-4 py-12 md:px-8 md:py-16">
          <header className="mb-10 border-b border-rule pb-8">
            <h1
              className="font-display text-ink"
              style={{
                fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)',
                lineHeight: 1.15,
                fontVariationSettings: '"opsz" 60, "SOFT" 30',
              }}
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </header>
          <div className="docs-prose">{children}</div>
        </article>
      </main>
      <Footer />
    </>
  );
}
