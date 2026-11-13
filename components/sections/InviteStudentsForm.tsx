'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiUrl } from '@/lib/basePath';

export function InviteStudentsForm({ sectionId }: { sectionId: string }) {
  const [emails, setEmails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch(
        apiUrl(`/api/professor/section/${sectionId}/student-invites`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send invites');
        return;
      }
      const emailed = Array.isArray(data.results)
        ? data.results.filter((r: { emailSent?: boolean }) => r.emailSent).length
        : 0;
      setSummary(
        `Invited ${data.invited ?? 0}` +
          (data.failed ? `, ${data.failed} failed` : '') +
          (emailed ? ` · ${emailed} emailed` : ' · share claim links if email is off'),
      );
      setEmails('');
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <p className="text-xs text-ink-muted leading-relaxed">
        Paste student emails (one per line or CSV). Each gets a claim link and
        the section enrollment code. Copy-link still works when email is off.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor={`student-invite-${sectionId}`}>Emails</Label>
        <Textarea
          id={`student-invite-${sectionId}`}
          rows={4}
          placeholder={'student1@university.edu\nstudent2@university.edu'}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          disabled={busy}
          required
        />
      </div>
      <Button type="submit" disabled={busy || !emails.trim()}>
        {busy ? 'Sending…' : 'Invite students'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {summary ? <p className="text-sm text-brand">{summary}</p> : null}
    </form>
  );
}
