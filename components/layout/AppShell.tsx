import * as React from "react";

import { AppChrome } from "@/components/layout/AppChrome";
import type { AppRole } from "@/lib/nav-config";

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
  /** Ignored: legacy prop kept for call-site compatibility. */
  topbarEyebrow?: React.ReactNode;
  /** Top bar title text (small, usually current section). */
  topbarTitle?: React.ReactNode;
  /** Top bar action slot. */
  topbarActions?: React.ReactNode;
  /** Constrain main content width. Defaults to the fluid page rail. */
  maxWidth?: "default" | "wide" | "narrow" | "full";
  className?: string;
  children: React.ReactNode;
}

export function AppShell(props: AppShellProps) {
  return <AppChrome {...props} />;
}
