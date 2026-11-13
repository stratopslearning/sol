/**
 * Schedule material extract/embed via Inngest (or `after()` fallback).
 */
import { enqueueMaterialProcess } from '@/lib/jobs/enqueue';

export function scheduleMaterialProcess(
  materialId: string,
  workspaceId?: string | null,
): void {
  if (!materialId) return;
  void enqueueMaterialProcess(materialId, workspaceId ?? 'default');
}
