import type { ReactNode } from 'react';

import { Footer } from '@/components/marketing/Footer';
import { Navbar } from '@/components/frontend/Navbar';

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="min-h-[70vh] pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
