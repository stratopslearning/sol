import { rateLimit } from '@/lib/rateLimit';

const INVITES_PER_WORKSPACE_PER_HOUR = 100;

/**
 * Soft budget for SES invite sends per workspace. Returns false when over budget
 * (caller should skip email but still return claim URL).
 */
export async function trySendInviteBudget(
  workspaceId: string,
): Promise<boolean> {
  const result = await rateLimit({
    key: `email-invite:${workspaceId}`,
    limit: INVITES_PER_WORKSPACE_PER_HOUR,
    windowMs: 60 * 60 * 1000,
    prefix: 'email',
  });
  return result.success;
}
