import type { DashboardAreas } from '@/lib/authz/gates';
import { paymentsEnabled } from '@/lib/featureFlags';
import { solHref } from '@/lib/solHosts';

export function resolveMarketingDashboardHref(
  areas: DashboardAreas,
  paid: boolean,
): string | null {
  if (areas.platformStaff) return solHref('/dashboard/admin');
  if (areas.teaching && areas.learning) return solHref('/dashboard/home');
  if (areas.teaching) return solHref('/dashboard/professor');
  if (areas.learning) {
    const entitled = !paymentsEnabled() || paid;
    return entitled ? solHref('/dashboard/student') : solHref('/payment');
  }
  return null;
}

export function marketingDashboardCtaLabel(
  areas: DashboardAreas,
  paid: boolean,
): string {
  const entitled = !paymentsEnabled() || paid;
  if (areas.learning && !entitled) return 'Complete enrolment';
  return 'Open your dashboard';
}
