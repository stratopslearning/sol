"use client";

import { Menu } from "lucide-react";

import { useMobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface AppTopBarProps {
  /** Page title slot (typically just plain text or a small node). */
  title?: React.ReactNode;
  /** Right-side custom slot (e.g. quick actions). */
  actions?: React.ReactNode;
}

export function AppTopBar({ title, actions }: AppTopBarProps) {
  const mobileNav = useMobileNav();

  return (
    <header
      data-app-topbar
      className={cn(
        "sticky top-0 z-30 bg-paper/85 backdrop-blur-md",
        "border-b border-rule",
      )}
    >
      <div className="flex h-14 items-center gap-3 px-4 md:gap-4 md:px-8">
        {mobileNav ? (
          <button
            type="button"
            onClick={mobileNav.open}
            aria-label="Open navigation"
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:hidden",
              "border border-rule bg-surface text-ink-muted",
              "hover:border-rule-strong hover:bg-surface-sunken hover:text-ink",
              "transition-colors",
            )}
          >
            <Menu className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {title ? (
            <span className="block truncate text-sm font-medium text-ink">
              {title}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
