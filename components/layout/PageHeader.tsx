import * as React from "react";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small caps eyebrow shown above the title. */
  eyebrow?: string;
  /** The page title: rendered in Instrument Serif. */
  title: React.ReactNode;
  /** A short paragraph beneath the title (~ 60-80ch). */
  description?: React.ReactNode;
  /** Right-aligned actions slot (buttons, links). */
  actions?: React.ReactNode;
  /** Breadcrumb trail, omitted on top-level dashboard pages. */
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-5 pt-2", className)}>
      {breadcrumbs && breadcrumbs.length ? (
        <Breadcrumbs items={breadcrumbs} />
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex flex-col gap-2 max-w-3xl">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1
            className="font-display text-ink text-balance"
            style={{
              fontSize: "clamp(1.9rem, 1.4vw + 1.2rem, 2.85rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          {description ? (
            <p className="text-base text-ink-muted leading-relaxed max-w-[65ch]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="hairline" />
    </div>
  );
}
