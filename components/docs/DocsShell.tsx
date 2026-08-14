import type { ReactNode } from 'react';

import { Footer } from '@/components/marketing/Footer';
import { Navbar } from '@/components/frontend/Navbar';

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="min-h-[70vh] pt-16 bg-[color-mix(in_oklch,var(--surface-sunken)_40%,transparent)]">
        {children}
      </main>
      <Footer />
    </>
  );
}
