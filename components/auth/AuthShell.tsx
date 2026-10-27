import * as React from "react";
import Image from "next/image";
import { Shield } from "lucide-react";

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
      <SolMark className="h-7 w-7" />
      <span className="font-display text-[1.2rem] leading-none tracking-tight">
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
        <div className="mb-5 flex justify-center">
          <BrandHome />
        </div>
        <h1
          className="font-display text-ink text-balance"
          style={{
            fontSize: "clamp(1.65rem, 1.2vw + 1.2rem, 2rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mx-auto mt-2.5 max-w-[32ch] text-balance text-sm leading-relaxed text-ink-muted">
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
      <div className="auth-page mkt flex min-h-screen flex-col text-ink">
        <main
          id="main"
          className={cn(
            "flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-16",
            className,
          )}
        >
          <div className="animate-rise flex w-full max-w-[26rem] flex-col items-center gap-6">
            {formCard}
            {footnoteBlock}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page mkt grid min-h-svh text-ink lg:grid-cols-2">
      <aside className="relative isolate hidden min-h-svh overflow-hidden lg:block">
        <Image
          src={src}
          alt={paintingAlt}
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
      </aside>

      {/* Mobile painting strip */}
      <div className="relative isolate h-[32vh] min-h-[180px] w-full overflow-hidden lg:hidden">
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
          "flex min-h-0 flex-col items-center justify-center bg-paper px-5 py-10 sm:px-8 md:py-14",
          className,
        )}
      >
        <div className="animate-rise flex w-full max-w-[24.5rem] flex-col items-center gap-6">
          {formCard}
          {footnoteBlock}
        </div>
      </main>
    </div>
  );
}
