'use client';

import { useDisplayTimeZone } from '@/components/timezone/TimeZoneProvider';
import {
  formatDateStable,
  formatDateTimeStable,
  normalizeDatabaseDate,
} from '@/lib/utils';

export function LocalDateTime({
  value,
  fallback = '—',
  dateOnly = false,
}: {
  value: Date | string | null | undefined;
  fallback?: string;
  dateOnly?: boolean;
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

  const label = dateOnly
    ? formatDateStable(dateObj, timeZone)
    : formatDateTimeStable(dateObj, timeZone);
  if (!label || label === 'Invalid date') return <>{fallback}</>;

  return (
    <time dateTime={dateObj.toISOString()} className="tnum">
      {label}
    </time>
  );
}
