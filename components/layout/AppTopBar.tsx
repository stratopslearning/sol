"use client";

import * as React from "react";
import { UserButton } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface AppTopBarProps {
  /** Optional eyebrow/section label rendered on the left (e.g. "Faculty"). */
  eyebrow?: string;
  /** Page title slot (typically just plain text or a small node). */
  title?: React.ReactNode;
  /** Right-side custom slot (e.g. quick actions). */
  actions?: React.ReactNode;
}

export function AppTopBar({ eyebrow, title, actions }: AppTopBarProps) {
  return (
    <header
      data-app-topbar
      className={cn(
        "sticky top-0 z-30 bg-paper/85 backdrop-blur-md",
        "border-b border-rule",
      )}
    >
      <div className="flex h-14 items-center gap-4 px-4 md:px-8">
        <div className="flex-1 min-w-0 flex items-baseline gap-3 md:pl-0 pl-12">
          {eyebrow ? (
            <span className="hidden md:inline eyebrow">{eyebrow}</span>
          ) : null}
          {eyebrow && title ? (
            <span className="hidden md:inline text-ink-faint">/</span>
          ) : null}
          {title ? (
            <span className="text-sm font-medium text-ink truncate">
              {title}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
          <div className="ml-1 flex items-center">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 border border-rule",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
