import * as React from "react";
import { Shield } from "lucide-react";

import { AuthClerkHost } from "@/components/auth/AuthClerkHost";
import { Navbar } from "@/components/frontend/Navbar";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  /** Card heading. */
  title: React.ReactNode;
  /** Short line beneath the title. */
  description?: React.ReactNode;
  /** Trust note below the card. */
  footnote?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function AuthShell({
  title,
  description,
  footnote,
  className,
  children,
}: AuthShellProps) {
  return (
    <div className="auth-page min-h-screen text-ink flex flex-col">
      <Navbar />
      <main
        id="main"
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-12 md:pt-28 md:pb-16",
          className,
        )}
      >
        <div className="w-full max-w-[440px] flex flex-col items-center gap-7 animate-rise">
          <article className="auth-card w-full">
            <header className="auth-card-header">
              <h1
                className="font-display text-ink text-balance"
                style={{
                  fontSize: "1.625rem",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  fontVariationSettings: '"opsz" 48, "SOFT" 30',
                }}
              >
                {title}
              </h1>
              {description ? (
                <p className="text-sm text-ink-muted leading-relaxed text-balance mt-2">
                  {description}
                </p>
              ) : null}
            </header>

            <div className="auth-card-body">
              <AuthClerkHost>{children}</AuthClerkHost>
            </div>
          </article>

          {footnote ? (
            <div className="flex items-start justify-center gap-2 text-center max-w-[360px]">
              <Shield
                className="h-3.5 w-3.5 shrink-0 text-ink-faint mt-0.5"
                aria-hidden
              />
              <p className="text-xs text-ink-faint leading-relaxed">{footnote}</p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
