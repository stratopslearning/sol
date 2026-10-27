"use client";

import * as React from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { MobileNavProvider } from "@/components/layout/mobile-nav";
import type { AppRole } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

interface AppChromeProps {
  role: AppRole;
  active?: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    paid?: boolean | null;
  };
  /** Ignored: kept so existing pages that pass topbarEyebrow still typecheck. */
  topbarEyebrow?: React.ReactNode;
  topbarTitle?: React.ReactNode;
  topbarActions?: React.ReactNode;
  maxWidth?: "default" | "wide" | "narrow" | "full";
  className?: string;
  children: React.ReactNode;
}

const MAX_WIDTH: Record<NonNullable<AppChromeProps["maxWidth"]>, string> = {
  narrow: "page-rail-narrow",
  default: "page-rail",
  wide: "page-rail-wide",
  full: "max-w-none",
};

export function AppChrome({
  role,
  active,
  user,
  topbarTitle,
  topbarActions,
  maxWidth = "default",
  className,
  children,
}: AppChromeProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const openMobile = React.useCallback(() => setMobileOpen(true), []);
  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  return (
    <MobileNavProvider open={openMobile}>
      <div className="flex min-h-dvh overscroll-none bg-paper font-sans text-ink">
        <AppSidebar
          role={role}
          active={active}
          user={user}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          onMobileClose={closeMobile}
        />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col overscroll-none">
          <AppTopBar title={topbarTitle} actions={topbarActions} />
          <main
            id="main"
            className={cn(
              "flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10 xl:py-10 2xl:px-12",
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
    </MobileNavProvider>
  );
}
