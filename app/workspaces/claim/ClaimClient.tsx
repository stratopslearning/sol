'use client';

import { useState, useTransition } from 'react';

import { claimInviteAction } from '@/app/workspaces/claim/actions';
import { Button } from '@/components/ui/button';

export function ClaimClient({
  token,
  workspaceName,
  inviteEmail,
  sessionEmail,
  emailMatches,
  disabledReason,
  inviteRole,
}: {
  token: string;
  workspaceName: string;
  inviteEmail: string;
  sessionEmail: string;
  emailMatches: boolean;
  disabledReason?: string | null;
  inviteRole?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOwnerInvite = inviteRole === 'owner';

  function claim() {
    if (disabledReason || !emailMatches) return;
    setError(null);
    startTransition(async () => {
      const result = await claimInviteAction(token);
      if (result && 'error' in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-8 flex flex-col items-start gap-4">
      <div className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <p className="font-medium text-ink">{workspaceName}</p>
        <p className="mt-1 text-ink-muted">
          {isOwnerInvite ? 'Owner invite' : 'Faculty invite'} for{' '}
          <span className="text-ink">{inviteEmail}</span>
        </p>
        <p className="mt-1 text-ink-muted">
          Signed in as <span className="text-ink">{sessionEmail || 'unknown'}</span>
        </p>
      </div>

      {!emailMatches ? (
        <p className="text-sm text-destructive">
          Switch to {inviteEmail} (or open this link in a window signed in as
          that account), then claim.
        </p>
      ) : null}

      {disabledReason ? (
        <p className="text-sm text-destructive">{disabledReason}</p>
      ) : null}

      <Button
        type="button"
        onClick={claim}
        disabled={pending || !token || !emailMatches || Boolean(disabledReason)}
      >
        {pending
          ? 'Claiming…'
          : isOwnerInvite
            ? 'Claim workspace'
            : 'Join as faculty'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
