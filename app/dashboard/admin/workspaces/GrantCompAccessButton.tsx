'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Gift } from '@/components/icons';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/basePath';

export function GrantCompAccessButton({
  workspaceId,
  name,
  alreadyChurned,
}: {
  workspaceId: string;
  name: string;
  alreadyChurned?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGrant() {
    if (alreadyChurned) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/workspaces/${workspaceId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant_comp_access', days: 30 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Grant failed');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  if (alreadyChurned) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-ink-muted hover:text-ink"
          title="Grant 30-day complimentary access"
        >
          <Gift className="h-4 w-4" />
          <span className="sr-only">Grant trial</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Grant 30-day access?</AlertDialogTitle>
          <AlertDialogDescription>
            Unlock <strong>{name}</strong> for course creation without Stripe for
            30 days. Useful for local demos and pilots when checkout isn’t
            available. Owner can still subscribe later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button type="button" onClick={onGrant} disabled={busy}>
            {busy ? 'Granting…' : 'Grant 30 days'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
