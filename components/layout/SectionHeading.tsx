import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Render the title as a serif display heading (default true). */
  serif?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  className,
  serif = true,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="hairline" />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h2
            className={cn(
              serif ? "font-display text-ink" : "font-sans text-ink font-semibold",
              serif ? "" : "text-xl",
            )}
            style={
              serif
                ? {
                    fontSize: "clamp(1.375rem, 2vw, 1.625rem)",
                    lineHeight: 1.2,
                    letterSpacing: "-0.015em",
                    fontVariationSettings: '"opsz" 36',
                  }
                : undefined
            }
          >
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-ink-muted max-w-[60ch]">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
