import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
  /** Variant — full-page centered or inline. */
  variant?: "page" | "inline";
}

export function LoadingState({
  label = "Loading…",
  className,
  variant = "inline",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        variant === "page"
          ? "min-h-[60vh] flex flex-col items-center justify-center gap-3"
          : "flex items-center gap-2 text-sm text-ink-muted py-6",
        className,
      )}
    >
      <Loader2
        className={cn(
          "animate-spin",
          variant === "page" ? "h-6 w-6 text-brand" : "h-4 w-4 text-ink-faint",
        )}
        aria-hidden
      />
      <span
        className={cn(
          variant === "page" ? "eyebrow" : "text-ink-muted",
        )}
      >
        {label}
      </span>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-sunken border border-rule",
        className,
      )}
      aria-hidden
    />
  );
}
