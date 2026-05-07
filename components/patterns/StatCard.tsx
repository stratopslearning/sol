import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { cn } from "@/lib/utils";

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

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Caption shown below the value (e.g. "across 12 courses"). */
  hint?: React.ReactNode;
  /** Trend delta — small icon + percent. */
  delta?: {
    value: string;
    direction: "up" | "down" | "flat";
  };
  /** Right-side decorative icon, ink-faint. */
  icon?: React.ReactNode;
  /** href makes the entire card a link. */
  href?: string;
  /** Use accent (terracotta) instead of brand for a notable stat. */
  accent?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  href,
  accent = false,
  className,
}: StatCardProps) {
  const Wrapper = (href ? "a" : "div") as React.ElementType;
  return (
    <Wrapper
      href={href ? resolveHref(href) : undefined}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-rule bg-surface",
        "px-5 py-5 paper-shadow",
        "transition-all duration-200",
        href
          ? "hover:border-rule-strong hover:-translate-y-px hover:paper-shadow-lg cursor-pointer"
          : "",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {icon ? (
          <span className="text-ink-faint group-hover:text-ink-muted transition-colors">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className={cn(
            "stat-numeral tnum",
            accent ? "text-accent" : "text-ink",
          )}
          style={{ fontSize: "clamp(2.25rem, 4vw, 3rem)" }}
        >
          {value}
        </span>
        {delta ? <DeltaPill {...delta} /> : null}
      </div>
      {hint ? (
        <span className="text-xs text-ink-faint leading-snug">{hint}</span>
      ) : null}
    </Wrapper>
  );
}

function DeltaPill({
  value,
  direction,
}: NonNullable<StatCardProps["delta"]>) {
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
      ? ArrowDownRight
      : null;
  const tone =
    direction === "up"
      ? "text-success"
      : direction === "down"
      ? "text-danger"
      : "text-ink-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tnum",
        tone,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {value}
    </span>
  );
}
