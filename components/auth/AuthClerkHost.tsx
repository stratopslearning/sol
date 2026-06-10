"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Only hide Clerk chrome nodes — never walk text content (that hid the whole form). */
const CHROME_SELECTORS = [
  '[class*="footerPages"]',
  '[class*="developmentMode"]',
  '[class*="cl-badge"]',
].join(",");

function stripClerkChrome(root: HTMLElement) {
  root.querySelectorAll(CHROME_SELECTORS).forEach((el) => {
    if (el instanceof HTMLElement) el.style.display = "none";
  });
}

export function AuthClerkHost({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const run = () => stripClerkChrome(host);
    run();

    const observer = new MutationObserver(run);
    observer.observe(host, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={cn("auth-clerk-host w-full min-w-0", className)}>
      {children}
    </div>
  );
}
