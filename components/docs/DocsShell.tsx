import type { ReactNode } from "react";

import { Navbar } from "@/components/frontend/Navbar";
import { Footer } from "@/components/marketing/Footer";

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <div className="mkt flex min-h-screen flex-col bg-paper text-ink">
      <Navbar variant="solid" />
      <main id="main" className="flex-1 pt-20 md:pt-24">
        {children}
      </main>
      <Footer />
    </div>
  );
}
