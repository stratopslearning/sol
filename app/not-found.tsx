import Link from "next/link";
import { Sparkle } from "lucide-react";

import { appPath } from "@/lib/basePath";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <p className="not-found-watermark" aria-hidden>
        404
      </p>

      <div className="relative z-10 flex max-w-md flex-col items-center px-6 text-center animate-rise">
        <Sparkle
          className="h-5 w-5 text-brand-fg/90 mb-6"
          strokeWidth={1.75}
          aria-hidden
        />

        <h1
          className="font-display text-brand-fg text-balance"
          style={{
            fontSize: "clamp(2rem, 5vw, 2.75rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            fontVariationSettings: '"opsz" 48, "SOFT" 30',
          }}
        >
          Page not found.
        </h1>

        <p className="mt-4 text-sm md:text-base text-brand-fg/75 leading-relaxed text-balance max-w-[34ch]">
          This page does not exist. Head back home and try again.
        </p>

        <Link href={appPath("/")} className="not-found-cta mt-9">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
