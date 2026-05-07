"use client";

import { Navbar } from "@/components/frontend/Navbar";
import { Hero } from "@/components/marketing/Hero";

/**
 * Legacy export — preserved so any existing imports keep working.
 * The real landing page is composed in `app/page.tsx` from
 * `Hero`, `FeatureGrid`, `Approach`, and `Footer`.
 */
export function HeroGeometric() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
      </main>
    </>
  );
}

export default HeroGeometric;
