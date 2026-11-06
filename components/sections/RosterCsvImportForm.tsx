'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiUrl } from '@/lib/basePath';

export function RosterCsvImportForm({ sectionId }: { sectionId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const csv = await file.text();
      const res = await fetch(
        apiUrl(`/api/professor/section/${sectionId}/roster-import`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Import failed');
        return;
      }
      setSummary(
        `Enrolled ${data.enrolled ?? 0}, failed ${data.failed ?? 0}.`,
      );
    } catch {
      setError('Could not read file');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`roster-csv-${sectionId}`}>Roster CSV (one email per row)</Label>
      <input
        id={`roster-csv-${sectionId}`}
        type="file"
        accept=".csv,text/csv"
        disabled={busy}
        onChange={onFileChange}
        className="text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-rule file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-ink"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {summary ? <p className="text-sm text-ink-muted">{summary}</p> : null}
    </div>
  );
}
