'use server';

import { appPath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { claimWorkspaceInvite } from '@/lib/workspace/invites';

export type ClaimActionResult =
  | { error: string }
  | { ok: true; redirectTo: string };

/**
 * Claim from the page itself (avoids cold /api/workspaces/claim compile).
 * Returns a redirect path for a hard navigation — soft redirects leave Clerk
 * <SignIn/> mounted and it crashes looking for a catch-all under the new URL.
 */
export async function claimInviteAction(
  token: string,
): Promise<ClaimActionResult> {
  const trimmed = token?.trim();
  if (!trimmed || trimmed.length < 16) {
    return { error: 'Invalid invite token' };
  }

  const user = await getOrCreateUser();
  if (!user) {
    return { error: 'Sign in required' };
  }

  const result = await claimWorkspaceInvite({
    token: trimmed,
    user: {
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
    },
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    ok: true,
    redirectTo: user.platformStaff
      ? appPath('/dashboard/admin/workspaces')
      : appPath('/dashboard/workspace'),
  };
}
