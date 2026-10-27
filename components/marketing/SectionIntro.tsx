import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionIntroProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  className?: string;
};

/** Shared marketing section header: one job, short support line. */
export function SectionIntro({
  eyebrow,
  title,
  description,
  align = "start",
  className,
}: SectionIntroProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "mx-auto max-w-[40rem] items-center text-center",
        className,
      )}
    >
      <span className="eyebrow text-ink-faint">{eyebrow}</span>
      <h2
        className="font-display text-ink text-balance"
        style={{
          fontSize: "clamp(1.875rem, 1.2vw + 1.35rem, 2.75rem)",
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
          fontVariationSettings: '"opsz" 96, "SOFT" 30',
        }}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "text-base leading-relaxed text-ink-muted md:text-lg",
            align === "center" ? "max-w-[42ch]" : "max-w-[48ch]",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
