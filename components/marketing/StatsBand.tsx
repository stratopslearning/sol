"use client";

import type { MarketingStats } from "@/lib/marketingStats";
import { cn } from "@/lib/utils";

const numberFormat = new Intl.NumberFormat("en-US");

function StatChip({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-2.5 px-6 md:px-10">
      <span
        className="font-display tnum text-brand text-lg md:text-xl"
        style={{ fontVariationSettings: '"opsz" 48, "SOFT" 25' }}
      >
        {numberFormat.format(value)}
      </span>
      <span className="eyebrow whitespace-nowrap text-ink-muted">{label}</span>
    </span>
  );
}

function Separator() {
  return (
    <span
      aria-hidden
      className="mx-1 inline-flex h-1 w-1 shrink-0 rounded-full bg-brand/35 md:mx-2"
    />
  );
}

export function StatsBand({ stats }: { stats: MarketingStats }) {
  const items = [
    { label: "quizzes scored", value: stats.quizzesGraded },
    { label: "sections running", value: stats.activeSections },
    { label: "learners on board", value: stats.learnersEnrolled },
    { label: "quizzes written", value: stats.quizzesAuthored },
  ] as const;

  const renderTrack = (trackId: string) =>
    items.flatMap((item, index) => [
      <StatChip
        key={`${trackId}-${item.label}`}
        value={item.value}
        label={item.label}
      />,
      <Separator key={`${trackId}-sep-${index}`} />,
    ]);

  return (
    <section
      aria-label="Platform statistics"
      className={cn(
        "relative -mt-px overflow-hidden",
        "border-y border-rule/70",
        "bg-[color-mix(in_oklch,var(--paper)_78%,transparent)]",
        "backdrop-blur-md",
      )}
    >
      {/* Soft mesh bleed from the hero above */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklch,var(--paper)_55%,transparent))]"
      />

      <div className="marquee-fade relative py-5 md:py-6" aria-hidden>
        <div className="marquee-track">
          {renderTrack("a")}
          {renderTrack("b")}
        </div>
      </div>

      <dl className="sr-only">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{numberFormat.format(item.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
