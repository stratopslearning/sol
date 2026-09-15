'use client';

import { useDisplayTimeZone } from '@/components/timezone/TimeZoneProvider';
import {
  formatDateStable,
  formatDateTimeStable,
  formatTimeStable,
  normalizeDatabaseDate,
} from '@/lib/utils';

export function LocalDateTime({
  value,
  fallback = '—',
  dateOnly = false,
  stacked = false,
}: {
  value: Date | string | null | undefined;
  fallback?: string;
  dateOnly?: boolean;
  /** Date on the first line, time + zone on the second — use in fixed tables. */
  stacked?: boolean;
}) {
  const timeZone = useDisplayTimeZone();
  const dateObj = normalizeDatabaseDate(value);
  if (!dateObj) return <>{fallback}</>;

  // Until the browser timezone is known, keep a stable placeholder so SSR
  // never prints UTC as if it were local.
  if (!timeZone) {
    return (
      <time dateTime={dateObj.toISOString()} className="tnum">
        {fallback === '—' ? '\u00a0' : fallback}
      </time>
    );
  }

  if (dateOnly) {
    const label = formatDateStable(dateObj, timeZone);
    if (!label) return <>{fallback}</>;
    return (
      <time dateTime={dateObj.toISOString()} className="tnum">
        {label}
      </time>
    );
  }

  if (stacked) {
    const dateLabel = formatDateStable(dateObj, timeZone);
    const timeLabel = formatTimeStable(dateObj, timeZone);
    if (!dateLabel || timeLabel === 'Invalid date') return <>{fallback}</>;
    return (
      <time
        dateTime={dateObj.toISOString()}
        className="tnum inline-flex flex-col items-start gap-0.5 leading-snug whitespace-normal"
      >
        <span>{dateLabel}</span>
        <span className="text-ink-muted">{timeLabel}</span>
      </time>
    );
  }

  const label = formatDateTimeStable(dateObj, timeZone);
  if (!label || label === 'Invalid date') return <>{fallback}</>;

  return (
    <time dateTime={dateObj.toISOString()} className="tnum">
      {label}
    </time>
  );
}
