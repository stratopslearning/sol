import Link from 'next/link';

import { WorkspaceBillingButton } from '@/app/dashboard/workspace/WorkspaceBillingButton';
import { Button } from '@/components/ui/button';
import { appPath } from '@/lib/basePath';

/**
 * Persistent banner when Creator/Business teaching is blocked (revoked pilot
 * or missing Stripe). Reads stay available; mutations return 402.
 */
export function TeachingPaywallBanner({
  workspaceId,
  reason,
  showCheckout = true,
}: {
  workspaceId: string;
  reason?: string;
  showCheckout?: boolean;
}) {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-50/80 px-4 py-3 text-sm text-ink"
    >
      <p className="font-medium text-ink">
        {reason?.trim() ||
          'Pilot ended. Finish billing to keep teaching, or ask SOL to restore access.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {showCheckout ? (
          <WorkspaceBillingButton workspaceId={workspaceId} />
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href={appPath('/dashboard/workspace')}>Open workspace</Link>
        </Button>
      </div>
    </div>
  );
}
