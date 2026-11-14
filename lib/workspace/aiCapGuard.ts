import { logAudit } from '@/lib/audit';
import { maybeNotifyAiCapOwners } from '@/lib/email/aiCapAlert';
import { assertAiBandAvailable } from '@/lib/workspace/usage';

export type AiCapBlock = {
  ok: false;
  used: number;
  cap: number;
  reason: string;
};

const recentCapAudit = new Map<string, number>();
const CAP_AUDIT_COOLDOWN_MS = 60_000;

/** Returns block info when workspace is at/over its AI unit cap. */
export async function checkAiBandAvailable(
  workspaceId: string | null | undefined,
): Promise<{ ok: true } | AiCapBlock> {
  if (!workspaceId || workspaceId === 'default') return { ok: true };
  const result = await assertAiBandAvailable(workspaceId);
  if (result.ok) return { ok: true };

  const now = Date.now();
  const last = recentCapAudit.get(workspaceId) ?? 0;
  if (now - last >= CAP_AUDIT_COOLDOWN_MS) {
    recentCapAudit.set(workspaceId, now);
    void logAudit({
      action: 'workspace.ai_cap.blocked',
      targetType: 'workspace',
      targetId: workspaceId,
      tenantId: workspaceId,
      metadata: {
        used: result.used,
        cap: result.cap,
        reason: result.reason,
      },
    });
    void maybeNotifyAiCapOwners({
      workspaceId,
      used: result.used,
      cap: result.cap,
    });
  }

  return result;
}
