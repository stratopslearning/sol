"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { apiUrl, withBasePath } from "@/lib/basePath";
import { paymentsEnabled } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

interface DbUser {
  role?: "STUDENT" | "PROFESSOR" | "ADMIN";
  paid?: boolean;
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      fetch(apiUrl("/api/user"))
        .then((res) => res.json())
        .then((data) => setDbUser(data.user))
        .catch((err) => console.error("Error fetching user:", err));
    }
  }, [isSignedIn]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While the paywall is disabled, students go directly to the dashboard
  // regardless of `paid`.
  const studentEntitled = !paymentsEnabled() || Boolean(dbUser?.paid);
  const dashboardHref =
    dbUser?.role === "ADMIN"
      ? withBasePath("/dashboard/admin")
      : dbUser?.role === "PROFESSOR"
      ? withBasePath("/dashboard/professor")
      : dbUser?.role === "STUDENT"
      ? studentEntitled
        ? withBasePath("/dashboard/student")
        : withBasePath("/payment")
      : null;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-200",
          isScrolled
            ? "bg-paper/85 backdrop-blur-md border-b border-rule"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <div className="flex h-16 items-center justify-between">
            <a
              href={withBasePath("/")}
              className="nav-beam flex items-baseline gap-1 text-ink"
            >
              <span
                className="font-display text-xl tracking-tight"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
              >
                SOL
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#capabilities" className="nav-beam text-ink-muted">
                Capabilities
              </a>
              <a href="#approach" className="nav-beam text-ink-muted">
                Approach
              </a>
              <a href="#access" className="nav-beam text-ink-muted">
                Access
              </a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {isSignedIn && dbUser ? (
                <>
                  {dashboardHref ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={dashboardHref} className="nav-beam nav-beam-btn">
                        {dbUser.role === "STUDENT" && !studentEntitled
                          ? "Complete payment"
                          : "Open dashboard"}
                      </a>
                    </Button>
                  ) : null}
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 border border-rule",
                      },
                    }}
                  />
                </>
              ) : (
                <>
                  <Button asChild size="sm" variant="ghost">
                    <a href={withBasePath("/login")} className="nav-beam nav-beam-btn">
                      Sign in
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="default">
                    <a href={withBasePath("/signup")}>Sign Up</a>
                  </Button>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-label="Toggle menu"
                className="nav-beam nav-beam-btn inline-flex h-10 w-10 items-center justify-center rounded-md border border-rule text-ink"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed top-16 left-0 right-0 z-30 bg-paper border-b border-rule md:hidden"
          >
            <div className="px-4 py-5 flex flex-col gap-4">
              <a
                href="#capabilities"
                className="nav-beam text-ink py-2 text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Capabilities
              </a>
              <a
                href="#approach"
                className="nav-beam text-ink py-2 text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Approach
              </a>
              <a
                href="#access"
                className="nav-beam text-ink py-2 text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Access
              </a>
              <div className="hairline" />
              {isSignedIn ? (
                <>
                  {dashboardHref ? (
                    <Button asChild variant="default" className="w-full">
                      <a href={dashboardHref}>Open dashboard</a>
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <a href={withBasePath("/login")}>Sign in</a>
                  </Button>
                  <Button asChild variant="default" className="w-full">
                    <a href={withBasePath("/signup")}>Sign Up</a>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
