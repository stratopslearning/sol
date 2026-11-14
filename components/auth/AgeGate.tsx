"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { withBasePath } from "@/lib/basePath";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sol-age-gate-v1";

type AgeGateProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * COPPA / platform eligibility gate: users must confirm they are 13+ before
 * the Clerk sign-up widget mounts. Confirmation is kept in sessionStorage so
 * Clerk multi-step routes on /signup do not re-prompt within the tab.
 */
export function AgeGate({ children, className }: AgeGateProps) {
  const [confirmed, setConfirmed] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setConfirmed(true);
      }
    } catch {
      // private mode / blocked storage — gate every visit
    }
    setReady(true);
  }, []);

  const onConfirm = (checked: boolean | "indeterminate") => {
    const next = checked === true;
    setConfirmed(next);
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, "1");
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (!ready) {
    return (
      <div
        className={cn("min-h-[12rem] w-full", className)}
        aria-hidden
      />
    );
  }

  if (!confirmed) {
    return (
      <div className={cn("flex w-full flex-col gap-5", className)}>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-rule bg-surface/60 px-3.5 py-3 text-left transition-colors hover:border-rule-strong">
          <Checkbox
            checked={confirmed}
            onCheckedChange={onConfirm}
            className="mt-0.5"
            aria-describedby="age-gate-help"
          />
          <span className="text-sm leading-relaxed text-ink">
            I confirm I am at least 13 years old, and I agree to the{" "}
            <a
              href={withBasePath("/terms")}
              className="underline decoration-rule underline-offset-2 hover:text-brand"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Use
            </a>{" "}
            and{" "}
            <a
              href={withBasePath("/privacy")}
              className="underline decoration-rule underline-offset-2 hover:text-brand"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
        <p id="age-gate-help" className="text-xs leading-relaxed text-ink-faint">
          SOL is built for higher-education and adult learners. Accounts for
          children under 13 are not permitted.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
