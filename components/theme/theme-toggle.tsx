"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "@/components/icons";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /** `ghost`. soft over paintings / transparent nav. Default is a solid chip. */
  variant?: "default" | "ghost";
}

const CYCLE = ["light", "dark", "system"] as const;
type ThemeChoice = (typeof CYCLE)[number];

function nextTheme(current: string | undefined): ThemeChoice {
  const i = CYCLE.indexOf((current as ThemeChoice) ?? "system");
  return CYCLE[(i + 1) % CYCLE.length]!;
}

export function ThemeToggle({
  className,
  variant = "default",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const active: ThemeChoice = mounted
    ? ((CYCLE.includes(theme as ThemeChoice) ? theme : "system") as ThemeChoice)
    : "system";

  const label =
    active === "light"
      ? "Light mode (click for dark)"
      : active === "dark"
        ? "Dark mode (click for system)"
        : "System theme (click for light)";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme(theme))}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        variant === "default" && [
          "border border-rule bg-surface text-ink-muted",
          "hover:text-ink hover:border-rule-strong hover:bg-surface-sunken",
        ],
        variant === "ghost" && [
          "border border-transparent bg-transparent text-ink/55",
          "hover:bg-ink/5 hover:text-ink/80",
        ],
        className,
      )}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all",
          active === "light"
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 -rotate-90 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all",
          active === "dark"
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 rotate-90 opacity-0",
        )}
      />
      <Monitor
        className={cn(
          "absolute h-4 w-4 transition-all",
          active === "system"
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 opacity-0",
        )}
      />
    </button>
  );
}
