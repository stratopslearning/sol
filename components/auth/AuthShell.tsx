import * as React from "react";

import { Navbar } from "@/components/frontend/Navbar";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  /** Small caps eyebrow (e.g. "Sign in"). */
  eyebrow?: string;
  /** Serif page heading. */
  title: React.ReactNode;
  /** Short paragraph beneath the title. */
  description?: React.ReactNode;
  /** Right-side decorative panel. Hidden < md. */
  side?: React.ReactNode;
  /** Footnote at the bottom of the form column. */
  footnote?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  side,
  footnote,
  className,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Navbar />
      <main
        id="main"
        className={cn(
          "flex-1 pt-24 md:pt-32 pb-16 md:pb-20 paper-grain",
          className,
        )}
      >
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 grid md:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="md:col-span-7 flex flex-col gap-8">
            <div className="flex flex-col gap-3 max-w-[52ch]">
              {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
              <h1
                className="font-display text-ink"
                style={{
                  fontSize: "clamp(2.25rem, 4vw, 3.25rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                  fontVariationSettings: '"opsz" 96, "SOFT" 30',
                }}
              >
                {title}
              </h1>
              {description ? (
                <p className="text-base text-ink-muted leading-relaxed">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="hairline" />

            <div className="paper paper-shadow p-6 md:p-8">{children}</div>

            {footnote ? (
              <p className="text-xs text-ink-faint leading-relaxed max-w-[60ch]">
                {footnote}
              </p>
            ) : null}
          </div>

          <aside className="md:col-span-5 hidden md:block self-stretch">
            {side ?? <DefaultSidePanel />}
          </aside>
        </div>
      </main>
    </div>
  );
}

function DefaultSidePanel() {
  return (
    <div className="paper p-8 lg:p-10 sticky top-28 flex flex-col gap-8 paper-grain">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">Manifesto</span>
        <p
          className="font-display text-ink dropcap leading-tight"
          style={{
            fontSize: "1.625rem",
            fontVariationSettings: '"opsz" 60, "SOFT" 30',
            lineHeight: 1.25,
          }}
        >
          A learning environment is the architecture of attention. We design
          ours like a reading room, not a casino — quiet surfaces, clear
          hierarchy, and the trust that learners do not need to be tricked into
          showing up.
        </p>
      </div>

      <div className="hairline" />

      <dl className="grid grid-cols-3 gap-6">
        <Stat label="Institutions" value="34" />
        <Stat label="Courses" value="412" />
        <Stat label="Attempts" value="1.8M" />
      </dl>

      <p className="text-xs text-ink-faint leading-relaxed">
        SOL Learning is a closed beta. Onboarding is by department, not by
        seat. Faculty leads receive a dedicated specialist for the first term.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="stat-numeral tnum text-ink"
        style={{ fontSize: "2rem" }}
      >
        {value}
      </span>
      <span className="eyebrow text-ink-faint">{label}</span>
    </div>
  );
}
