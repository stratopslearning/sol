"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

// Internal absolute paths must include the basePath since these render as plain
// <a> tags. withBasePath is idempotent, so callers that already prefixed are safe.
function resolveHref(href: string): string {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }
  if (href.startsWith("/")) return withBasePath(href);
  return href;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 text-sm", className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <a
                  href={resolveHref(item.href)}
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn(
                    isLast ? "text-ink font-medium" : "text-ink-muted",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight
                  className="h-3.5 w-3.5 text-ink-faint"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
