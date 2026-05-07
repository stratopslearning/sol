import * as React from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import type { AppRole } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

interface AppShellProps {
  role: AppRole;
  /** Optional active key override for sidebar nav. */
  active?: string;
  /** Optional DB user for sidebar footer (paid status, name). */
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    paid?: boolean | null;
  };
  /** Top bar eyebrow (small caps). */
  topbarEyebrow?: string;
  /** Top bar title text (small, usually current section). */
  topbarTitle?: React.ReactNode;
  /** Top bar action slot. */
  topbarActions?: React.ReactNode;
  /** Constrain main content width. Defaults to 1200px. */
  maxWidth?: "default" | "wide" | "narrow" | "full";
  className?: string;
  children: React.ReactNode;
}

const MAX_WIDTH: Record<NonNullable<AppShellProps["maxWidth"]>, string> = {
  narrow: "max-w-3xl",
  default: "max-w-[1200px]",
  wide: "max-w-[1400px]",
  full: "max-w-none",
};

export function AppShell({
  role,
  active,
  user,
  topbarEyebrow,
  topbarTitle,
  topbarActions,
  maxWidth = "default",
  className,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <AppSidebar role={role} active={active} user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopBar
          eyebrow={topbarEyebrow}
          title={topbarTitle}
          actions={topbarActions}
        />
        <main
          id="main"
          className={cn(
            "flex-1 px-4 md:px-8 py-8 md:py-12",
            "animate-fade-in",
            className,
          )}
        >
          <div className={cn("mx-auto w-full", MAX_WIDTH[maxWidth])}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
