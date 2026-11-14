import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import { ClaimClient } from '@/app/workspaces/claim/ClaimClient';
import { Button } from '@/components/ui/button';
import { appPath, withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { peekWorkspaceInvite } from '@/lib/workspace/invites';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ token?: string | string[] }>;

function inviteCopy(role: string | undefined) {
  if (role === 'owner') {
    return {
      title: 'Claim your workspace',
      body: 'Sign in with the email your SOL admin invited. You become the workspace owner (faculty), not a platform administrator. Creator and Business plans complete billing next; campus plans are already licensed.',
    };
  }
  return {
    title: 'Join as faculty',
    body: 'Sign in with the email your workspace owner invited. You become a professor in this workspace — not a platform administrator.',
  };
}

export default async function WorkspaceClaimPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const raw = sp.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const { userId } = await auth();
  const user = userId ? await getOrCreateUser() : null;
  const peek = token ? await peekWorkspaceInvite(token) : null;
  const role = peek?.ok ? peek.role : undefined;
  const copy = inviteCopy(role);

  const loginHref = token
    ? appPath(
        `/login?redirect_url=${encodeURIComponent(withBasePath(`/workspaces/claim?token=${token}`))}`,
      )
    : appPath('/login');

  let disabledReason: string | null = null;
  if (peek && !peek.ok) {
    disabledReason = peek.error;
  } else if (peek?.ok && peek.claimed) {
    disabledReason = 'This invite was already claimed.';
  } else if (peek?.ok && peek.expired) {
    disabledReason =
      'This invite has expired. Ask your workspace owner for a new link.';
  }

  const inviteEmail = peek?.ok ? peek.email : '';
  const workspaceName = peek?.ok ? peek.workspaceName : 'Workspace';
  const sessionEmail = user?.email?.trim().toLowerCase() ?? '';
  const emailMatches =
    Boolean(sessionEmail) &&
    Boolean(inviteEmail) &&
    sessionEmail === inviteEmail.toLowerCase();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
        Workspace invite
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink">{copy.title}</h1>
      <p className="mt-3 text-sm text-ink-muted">{copy.body}</p>

      {!token ? (
        <p className="mt-8 text-sm text-destructive">
          Missing invite token. Ask your SOL contact for a fresh claim link.
        </p>
      ) : !userId || !user ? (
        <div className="mt-8 space-y-4">
          {peek?.ok ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <p className="font-medium text-ink">{peek.workspaceName}</p>
              <p className="mt-1 text-ink-muted">
                {peek.role === 'owner' ? 'Owner' : 'Faculty'} invite for{' '}
                <span className="text-ink">{peek.email}</span>
              </p>
            </div>
          ) : peek && !peek.ok ? (
            <p className="text-sm text-destructive">{peek.error}</p>
          ) : null}
          {disabledReason ? (
            <p className="text-sm text-destructive">{disabledReason}</p>
          ) : (
            <Button asChild>
              <Link href={loginHref}>Sign in to claim</Link>
            </Button>
          )}
        </div>
      ) : (
        <ClaimClient
          token={token}
          workspaceName={workspaceName}
          inviteEmail={inviteEmail || '(unknown)'}
          sessionEmail={sessionEmail || user.email}
          emailMatches={emailMatches}
          disabledReason={disabledReason}
          inviteRole={role}
        />
      )}
    </main>
  );
}
