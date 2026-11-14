import * as React from "react";
import Image from "next/image";
import { Shield } from "@/components/icons";

import { AuthClerkHost } from "@/components/auth/AuthClerkHost";
import { SolMark } from "@/components/brand/SolMark";
import { withBasePath } from "@/lib/basePath";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  /** Card heading. */
  title: React.ReactNode;
  /** Short line beneath the title. */
  description?: React.ReactNode;
  /** Trust note below the card. */
  footnote?: React.ReactNode;
  /**
   * Optional left-column oil painting (auth split).
   * Path under /public, e.g. "/marketing/auth-inkpot.jpg".
   */
  paintingSrc?: string;
  /** Accessible description of the painting. */
  paintingAlt?: string;
  className?: string;
  children: React.ReactNode;
}

function BrandHome() {
  return (
    <a
      href={withBasePath("/")}
      className="inline-flex items-center gap-2 text-ink"
      aria-label="SOL home"
    >
      {/* Always the landing black mark + wordmark — never path/variant labels */}
      <SolMark className="h-6 w-6 text-ink" title="SOL" />
      <span className="font-display text-[1.15rem] leading-none tracking-tight text-ink">
        SOL
      </span>
    </a>
  );
}

export function AuthShell({
  title,
  description,
  footnote,
  paintingSrc,
  paintingAlt = "",
  className,
  children,
}: AuthShellProps) {
  const split = Boolean(paintingSrc);
  const src = paintingSrc ? withBasePath(paintingSrc) : null;

  const formCard = (
    <article className="auth-card w-full overflow-visible text-center">
      <header className="auth-card-header">
        <div className="mb-3 flex justify-center">
          <BrandHome />
        </div>
        <h1
          className="font-display text-ink text-balance"
          style={{
            fontSize: "clamp(1.45rem, 1vw + 1.1rem, 1.75rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mx-auto mt-1.5 max-w-[34ch] text-balance text-[0.8125rem] leading-snug text-ink-muted">
            {description}
          </p>
        ) : null}
      </header>

      <div className="auth-card-body text-left">
        <AuthClerkHost>{children}</AuthClerkHost>
      </div>
    </article>
  );

  const footnoteBlock = footnote ? (
    <div className="flex max-w-[22rem] items-start justify-center gap-2 text-center">
      <Shield
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint"
        aria-hidden
      />
      <p className="text-xs leading-relaxed text-ink-faint">{footnote}</p>
    </div>
  ) : null;

  if (!split || !src) {
    return (
      <div className="auth-page mkt flex h-svh max-h-svh flex-col overflow-hidden text-ink">
        <main
          id="main"
          className={cn(
            "flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6",
            className,
          )}
        >
          <div className="animate-rise flex w-full max-w-[26rem] flex-col items-center gap-4">
            {formCard}
            {footnoteBlock}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page mkt grid h-svh max-h-svh overflow-hidden text-ink lg:grid-cols-2">
      <aside className="relative isolate hidden h-svh overflow-hidden lg:block">
        <Image
          src={src}
          alt={paintingAlt}
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
      </aside>

      {/* Mobile painting strip — short so the card fits without page scroll */}
      <div className="relative isolate h-[18vh] max-h-[140px] min-h-[96px] w-full overflow-hidden lg:hidden">
        <Image
          src={src}
          alt=""
          fill
          priority
          className="object-cover object-[center_45%]"
          sizes="100vw"
        />
      </div>

      <main
        id="main"
        className={cn(
          "flex min-h-0 flex-col items-center justify-center overflow-y-auto bg-paper px-5 py-5 sm:px-8 sm:py-6",
          className,
        )}
      >
        <div className="animate-rise flex w-full max-w-[24rem] flex-col items-center gap-3">
          {formCard}
          {footnoteBlock}
        </div>
      </main>
    </div>
  );
}
