export function sanitizeTimeZone(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const tz = value.trim();
  if (!tz || tz.length > 64) return null;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(0);
    return tz;
  } catch {
    return null;
  }
}

export function getBrowserTimeZone(): string {
  try {
    return (
      sanitizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ??
      'UTC'
    );
  } catch {
    return 'UTC';
  }
}
