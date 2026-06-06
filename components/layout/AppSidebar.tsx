"use client";

import * as React from "react";
import { LogOut, Menu, X } from "lucide-react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_CONFIG, type AppRole, type NavItem } from "@/lib/nav-config";
import { BASE_PATH, withBasePath } from "@/lib/basePath";
import { paymentsEnabled } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

function stripBasePath(p: string | null | undefined): string {
  if (!p) return "/";
  if (p.startsWith(BASE_PATH)) return p.slice(BASE_PATH.length) || "/";
  return p;
}

interface AppSidebarProps {
  role: AppRole;
  /** Optional active key override (for pages where pathname match isn't enough). */
  active?: string;
  /** Optional DB user used for the footer profile (otherwise falls back to Clerk). */
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    paid?: boolean | null;
  };
}

const ROLE_INDICATOR_ID = "appActiveIndicator";

export function AppSidebar({ role, active, user }: AppSidebarProps) {
  const config = ROLE_CONFIG[role];
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { user: clerkUser } = useUser();
  const pathname = usePathname();

  const profileFirstName = user?.firstName ?? clerkUser?.firstName ?? "";
  const profileLastName = user?.lastName ?? clerkUser?.lastName ?? "";
  const profileEmail =
    user?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? "";

  const initials = React.useMemo(() => {
    if (profileFirstName && profileLastName) {
      return `${profileFirstName[0]}${profileLastName[0]}`.toUpperCase();
    }
    if (profileFirstName) return profileFirstName[0].toUpperCase();
    if (profileEmail) return profileEmail[0].toUpperCase();
    return config.badge[0];
  }, [profileFirstName, profileLastName, profileEmail, config.badge]);

  const isItemActive = React.useCallback(
    (item: (typeof config.items)[number]) => {
      if (active) return active === item.key;
      // Next 13+ `usePathname()` returns the path WITHOUT basePath, but nav-config
      // hrefs include basePath (since they're rendered through plain <a>). Compare
      // both sides with the basePath stripped.
      const current = stripBasePath(pathname);
      const target = stripBasePath(item.href);
      if (current === target) return true;
      // Treat sub-routes as active for parent nav (e.g., /quizzes/123 → quizzes)
      if (item.key !== "dashboard" && current.startsWith(`${target}/`)) {
        return true;
      }
      return false;
    },
    [active, pathname, config.items],
  );

  return (
    <>
      <DesktopAside
        config={config}
        isItemActive={isItemActive}
        clerkImage={clerkUser?.imageUrl}
        firstName={profileFirstName}
        email={profileEmail}
        initials={initials}
        showPaid={role === "student" && paymentsEnabled()}
        paid={Boolean(user?.paid)}
      />

      {/* Mobile menu trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "md:hidden fixed top-3 left-3 z-40 inline-flex h-10 w-10 items-center justify-center",
          "rounded-md border border-rule bg-surface text-ink",
          "hover:bg-surface-sunken transition-colors",
          "shadow-sm",
        )}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.button
              type="button"
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className={cn(
                "absolute left-0 top-0 h-full w-[18rem] bg-surface border-r border-rule",
                "p-6 flex flex-col paper-grain",
              )}
            >
              <div className="flex items-center justify-between mb-8">
                <BrandHeader subtitle={config.subtitle} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavList
                config={config}
                isItemActive={isItemActive}
                onItemClick={() => setMobileOpen(false)}
                indicatorId={`${ROLE_INDICATOR_ID}-mobile`}
              />
              <SidebarFooter
                clerkImage={clerkUser?.imageUrl}
                firstName={profileFirstName}
                email={profileEmail}
                initials={initials}
                badge={config.badge}
                showPaid={role === "student" && paymentsEnabled()}
                paid={Boolean(user?.paid)}
              />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ---------- Pieces ---------- */

function DesktopAside(props: {
  config: (typeof ROLE_CONFIG)[AppRole];
  isItemActive: (item: NavItem) => boolean;
  clerkImage?: string | null;
  firstName: string;
  email: string;
  initials: string;
  showPaid: boolean;
  paid: boolean;
}) {
  const {
    config,
    isItemActive,
    clerkImage,
    firstName,
    email,
    initials,
    showPaid,
    paid,
  } = props;

  return (
    <aside
      data-sidebar
      className={cn(
        "hidden md:flex min-h-screen w-[15.5rem] shrink-0",
        "bg-surface border-r border-rule flex-col",
        "p-6 paper-grain",
      )}
    >
      <BrandHeader subtitle={config.subtitle} />
      <div className="hairline mt-6 mb-4" />
      <NavList
        config={config}
        isItemActive={isItemActive}
        indicatorId={ROLE_INDICATOR_ID}
      />
      <SidebarFooter
        clerkImage={clerkImage}
        firstName={firstName}
        email={email}
        initials={initials}
        badge={config.badge}
        showPaid={showPaid}
        paid={paid}
      />
    </aside>
  );
}

function BrandHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex flex-col gap-1">
      <a
        href={withBasePath("/")}
        className="font-display text-xl tracking-tight text-ink hover:text-brand transition-colors inline-flex items-baseline gap-1"
        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
      >
        <span>SOL</span>
        <span className="text-brand text-sm">·</span>
      </a>
      <span className="eyebrow">{subtitle}</span>
    </div>
  );
}

function NavList(props: {
  config: (typeof ROLE_CONFIG)[AppRole];
  isItemActive: (item: NavItem) => boolean;
  onItemClick?: () => void;
  indicatorId: string;
}) {
  const { config, isItemActive, onItemClick, indicatorId } = props;
  return (
    <nav className="flex flex-col gap-0.5">
      {config.items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item);
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "relative flex items-center gap-3 rounded-md pl-4 pr-3 py-2 text-sm",
              "transition-colors group",
              active
                ? "text-ink font-medium"
                : "text-ink-muted hover:text-ink hover:bg-surface-sunken",
            )}
          >
            {active ? (
              <motion.span
                layoutId={indicatorId}
                className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand"
                initial={false}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            ) : null}
            <Icon
              className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                active ? "text-brand" : "text-ink-faint group-hover:text-ink-muted",
              )}
            />
            <span>{item.label}</span>
          </a>
        );
      })}
      <SignOutButton redirectUrl={withBasePath("/")}>
        <button
          type="button"
          className={cn(
            "mt-2 flex items-center gap-3 rounded-md pl-4 pr-3 py-2",
            "text-sm text-ink-muted hover:text-danger hover:bg-danger-soft",
            "transition-colors w-full text-left",
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </SignOutButton>
    </nav>
  );
}

function SidebarFooter(props: {
  clerkImage?: string | null;
  firstName: string;
  email: string;
  initials: string;
  badge: string;
  showPaid: boolean;
  paid: boolean;
}) {
  const { clerkImage, firstName, email, initials, badge, showPaid, paid } =
    props;
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mt-auto pt-6">
      <div className="hairline mb-5" />
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-rule">
          {mounted && clerkImage ? (
            <AvatarImage src={clerkImage} alt={firstName || "User"} />
          ) : null}
          <AvatarFallback className="bg-brand-soft text-brand text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink truncate">
            {firstName || email || "Member"}
          </div>
          <div className="text-xs text-ink-faint truncate">{email}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="eyebrow">{badge}</span>
        {showPaid ? (
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-sm border",
              paid
                ? "text-success border-success/40 bg-success-soft"
                : "text-ink-muted border-rule bg-surface-sunken",
            )}
          >
            {paid ? "Paid" : "Trial"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
