import * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Optional decorative icon shown above the title. */
  icon?: React.ReactNode;
  /** Eyebrow above the title. */
  eyebrow?: string;
  /** The serif headline. */
  title: React.ReactNode;
  /** Supporting paragraph. */
  description?: React.ReactNode;
  /** Primary CTA(s) below the description. */
  actions?: React.ReactNode;
  /** Visual style — bordered paper card or bare. */
  variant?: "card" | "bare";
  className?: string;
}

export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  actions,
  variant = "card",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-4 px-6 py-12",
        variant === "card" && "rounded-lg border border-rule border-dashed bg-surface-sunken",
        className,
      )}
    >
      {icon ? (
        <div className="text-ink-faint flex items-center justify-center h-12 w-12 rounded-full border border-rule bg-surface">
          {icon}
        </div>
      ) : null}
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h3
        className="font-display text-ink"
        style={{
          fontSize: "1.5rem",
          lineHeight: 1.2,
          fontVariationSettings: '"opsz" 36',
        }}
      >
        {title}
      </h3>
      {description ? (
        <p className="text-sm text-ink-muted max-w-md leading-relaxed">
          {description}
        </p>
      ) : null}
      {actions ? <div className="flex items-center gap-2 mt-2">{actions}</div> : null}
    </div>
  );
}
