"use client";

import type { MarketingStats } from "@/lib/marketingStats";

const numberFormat = new Intl.NumberFormat("en-US");

function StatChip({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-2 px-8 md:px-12">
      <span
        className="font-display tnum text-ink text-lg md:text-xl"
        style={{ fontVariationSettings: '"opsz" 48, "SOFT" 20' }}
      >
        {numberFormat.format(value)}
      </span>
      <span className="eyebrow whitespace-nowrap">{label}</span>
    </span>
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
    items.map((item) => (
      <StatChip
        key={`${trackId}-${item.label}`}
        value={item.value}
        label={item.label}
      />
    ));

  return (
    <section aria-label="Platform statistics" className="bg-paper overflow-hidden">
      <div className="marquee-fade py-6 md:py-7" aria-hidden>
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
