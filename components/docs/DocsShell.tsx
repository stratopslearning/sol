import type { ReactNode } from 'react';

import { Footer } from '@/components/marketing/Footer';
import { Navbar } from '@/components/frontend/Navbar';
import { PaperTexturedRegion } from '@/components/marketing/PaperTexturedRegion';

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <PaperTexturedRegion>
        <main id="main" className="min-h-[70vh] pt-16">
          {children}
        </main>
        <Footer />
      </PaperTexturedRegion>
    </>
  );
}
